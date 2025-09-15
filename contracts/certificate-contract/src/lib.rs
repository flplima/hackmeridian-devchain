#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, String, Vec, vec};

// Certificate metadata structure
#[contracttype]
#[derive(Clone, Debug)]
pub struct Certificate {
    pub issuer: Address,
    pub event_id: String,
    pub event_name: String,
    pub date_issued: u64,
}

// Storage keys
#[contracttype]
pub enum DataKey {
    // Maps developer address to list of certificate IDs
    DevCertificates(Address),
    // Maps certificate ID to certificate data
    Certificate(u64),
    // Counter for certificate IDs
    CertificateCounter,
    // Maps address to authorization status
    AuthorizedIssuer(Address),
    // Contract admin
    Admin,
}

#[contract]
pub struct CertificateContract;

#[contractimpl]
impl CertificateContract {
    /// Initialize the contract with an admin
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::CertificateCounter, &0u64);
    }

    /// Authorize an organization to issue certificates
    pub fn authorize_issuer(env: Env, issuer: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        env.storage().persistent().set(&DataKey::AuthorizedIssuer(issuer.clone()), &true);
    }

    /// Revoke issuer authorization
    pub fn revoke_issuer(env: Env, issuer: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        env.storage().persistent().remove(&DataKey::AuthorizedIssuer(issuer));
    }

    /// Mint a certificate for a developer
    pub fn mint_certificate(
        env: Env,
        issuer: Address,
        developer: Address,
        event_id: String,
        event_name: String,
        date_issued: u64,
    ) -> u64 {
        // Require auth from the issuer
        issuer.require_auth();

        // Check if caller is authorized
        let is_authorized = env.storage()
            .persistent()
            .get(&DataKey::AuthorizedIssuer(issuer.clone()))
            .unwrap_or(false);

        if !is_authorized {
            panic!("Issuer not authorized");
        }

        // Get and increment certificate counter
        let cert_id: u64 = env.storage()
            .instance()
            .get(&DataKey::CertificateCounter)
            .unwrap_or(0);

        env.storage()
            .instance()
            .set(&DataKey::CertificateCounter, &(cert_id + 1));

        // Create certificate
        let certificate = Certificate {
            issuer: issuer.clone(),
            event_id,
            event_name,
            date_issued,
        };

        // Store certificate
        env.storage()
            .persistent()
            .set(&DataKey::Certificate(cert_id), &certificate);

        // Add certificate ID to developer's list
        let mut dev_certs: Vec<u64> = env.storage()
            .persistent()
            .get(&DataKey::DevCertificates(developer.clone()))
            .unwrap_or(vec![&env]);

        dev_certs.push_back(cert_id);

        env.storage()
            .persistent()
            .set(&DataKey::DevCertificates(developer), &dev_certs);

        cert_id
    }

    /// Get all certificates for a developer
    pub fn get_certificates(env: Env, developer: Address) -> Vec<Certificate> {
        let cert_ids: Vec<u64> = env.storage()
            .persistent()
            .get(&DataKey::DevCertificates(developer))
            .unwrap_or(vec![&env]);

        let mut certificates = vec![&env];

        for cert_id in cert_ids.iter() {
            if let Some(cert) = env.storage()
                .persistent()
                .get::<_, Certificate>(&DataKey::Certificate(cert_id)) {
                certificates.push_back(cert);
            }
        }

        certificates
    }

    /// Get a specific certificate by ID
    pub fn get_certificate(env: Env, cert_id: u64) -> Option<Certificate> {
        env.storage()
            .persistent()
            .get(&DataKey::Certificate(cert_id))
    }

    /// Verify if a developer has a certificate from a specific issuer for an event
    pub fn verify_certificate(
        env: Env,
        developer: Address,
        issuer: Address,
        event_id: String,
    ) -> bool {
        let certificates = Self::get_certificates(env, developer);

        certificates.iter().any(|cert| {
            cert.issuer == issuer && cert.event_id == event_id
        })
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    #[test]
    fn test_certificate_lifecycle() {
        let env = Env::default();
        let contract_id = env.register_contract(None, CertificateContract);
        let client = CertificateContractClient::new(&env, &contract_id);

        // Setup accounts
        let admin = Address::generate(&env);
        let issuer = Address::generate(&env);
        let developer = Address::generate(&env);

        // Initialize contract
        client.initialize(&admin);

        // Authorize issuer
        client.authorize_issuer(&issuer);

        // Mint certificate
        let event_id = String::from_str(&env, "RUST_BOOT_2025");
        let event_name = String::from_str(&env, "Rust Bootcamp 2025");
        let date_issued = 1704067200u64; // Jan 1, 2025

        env.mock_all_auths();
        let cert_id = client.mint_certificate(
            &issuer,
            &developer,
            &event_id,
            &event_name,
            &date_issued,
        );

        assert_eq!(cert_id, 0);

        // Get certificates
        let certs = client.get_certificates(&developer);
        assert_eq!(certs.len(), 1);
        assert_eq!(certs.get(0).unwrap().event_name, event_name);

        // Verify certificate
        let is_valid = client.verify_certificate(&developer, &issuer, &event_id);
        assert!(is_valid);
    }

    #[test]
    #[should_panic(expected = "Issuer not authorized")]
    fn test_unauthorized_issuer() {
        let env = Env::default();
        let contract_id = env.register_contract(None, CertificateContract);
        let client = CertificateContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let unauthorized = Address::generate(&env);
        let developer = Address::generate(&env);

        client.initialize(&admin);

        env.mock_all_auths();
        // This should panic
        client.mint_certificate(
            &unauthorized,
            &developer,
            &String::from_str(&env, "TEST"),
            &String::from_str(&env, "Test Event"),
            &0u64,
        );
    }

    #[test]
    fn test_multiple_certificates() {
        let env = Env::default();
        let contract_id = env.register_contract(None, CertificateContract);
        let client = CertificateContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let issuer1 = Address::generate(&env);
        let issuer2 = Address::generate(&env);
        let developer = Address::generate(&env);

        // Initialize and authorize issuers
        client.initialize(&admin);
        client.authorize_issuer(&issuer1);
        client.authorize_issuer(&issuer2);

        env.mock_all_auths();

        // Mint certificates from different issuers
        client.mint_certificate(
            &issuer1,
            &developer,
            &String::from_str(&env, "EVENT_1"),
            &String::from_str(&env, "First Event"),
            &1704067200u64,
        );

        client.mint_certificate(
            &issuer2,
            &developer,
            &String::from_str(&env, "EVENT_2"),
            &String::from_str(&env, "Second Event"),
            &1704153600u64,
        );

        // Check developer has multiple certificates
        let certs = client.get_certificates(&developer);
        assert_eq!(certs.len(), 2);
    }

    #[test]
    fn test_revoke_issuer() {
        let env = Env::default();
        let contract_id = env.register_contract(None, CertificateContract);
        let client = CertificateContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let issuer = Address::generate(&env);
        let developer = Address::generate(&env);

        // Initialize and authorize issuer
        client.initialize(&admin);
        client.authorize_issuer(&issuer);

        env.mock_all_auths();

        // Successfully mint certificate
        client.mint_certificate(
            &issuer,
            &developer,
            &String::from_str(&env, "EVENT_1"),
            &String::from_str(&env, "First Event"),
            &1704067200u64,
        );

        // Revoke issuer
        client.revoke_issuer(&issuer);

        // Should now fail to mint
        env.mock_all_auths();
        let result = std::panic::catch_unwind(|| {
            client.mint_certificate(
                &issuer,
                &developer,
                &String::from_str(&env, "EVENT_2"),
                &String::from_str(&env, "Second Event"),
                &1704153600u64,
            );
        });

        assert!(result.is_err());
    }
}