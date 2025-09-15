# Certificate Smart Contract

A Soroban-based smart contract for issuing and managing non-transferable (soulbound) certificates to developers. Organizations can mint certificates to developers for completed courses, bootcamps, hackathons, and other events.

## Features

- **Non-transferable certificates**: Certificates are bound to the recipient's address and cannot be transferred
- **Issuer authorization**: Only authorized organizations can mint certificates
- **Rich metadata**: Each certificate stores issuer, event ID, name, and timestamp
- **Batch operations**: Retrieve all certificates for a developer in one call
- **Verification**: Easy verification of certificates by any party
- **Admin controls**: Contract admin can authorize/revoke issuer permissions

## Contract Structure

### Certificate Structure
```rust
pub struct Certificate {
    pub issuer: Address,      // Organization that issued the certificate
    pub event_id: String,     // Unique identifier for the event/course
    pub event_name: String,   // Human-readable name of the event
    pub date_issued: u64,     // Unix timestamp of issuance
}
```

### Main Functions

#### Administrative Functions
- `initialize(admin: Address)` - Initialize contract with admin
- `authorize_issuer(issuer: Address)` - Authorize an organization to issue certificates
- `revoke_issuer(issuer: Address)` - Revoke an organization's issuing permissions

#### Certificate Operations
- `mint_certificate(developer, event_id, event_name, date_issued) -> u64` - Mint a new certificate
- `get_certificates(developer: Address) -> Vec<Certificate>` - Get all certificates for a developer
- `get_certificate(cert_id: u64) -> Option<Certificate>` - Get a specific certificate by ID
- `verify_certificate(developer, issuer, event_id) -> bool` - Verify if a certificate exists

## Prerequisites

1. **Rust and Cargo** - Install from [rustup.rs](https://rustup.rs/)
2. **Soroban CLI** - Install with:
   ```bash
   cargo install --locked soroban-cli
   ```
3. **WebAssembly target**:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```

## Quick Start

### 1. Build the Contract
```bash
cd contracts/certificate-contract
./scripts/build.sh
```

### 2. Run Tests
```bash
./scripts/test.sh
```

### 3. Deploy to Testnet

Set up your environment variables:
```bash
export STELLAR_SECRET_KEY="your_secret_key_here"
export ADMIN_ADDRESS="your_admin_address_here"
```

Deploy the contract:
```bash
./scripts/deploy.sh
```

This will:
- Build the contract
- Deploy it to Stellar testnet
- Initialize it with your admin address
- Save the contract ID to `contract_id.txt`

### 4. Interact with the Contract

The contract includes an interaction script for common operations:

```bash
# Authorize an organization to issue certificates
./scripts/interact.sh authorize GORGADDRESS...

# Mint a certificate for a developer
./scripts/interact.sh mint GDEVADDRESS... "RUST_BOOTCAMP_2024" "Rust Development Bootcamp" 1704067200

# Get all certificates for a developer
./scripts/interact.sh get GDEVADDRESS...

# Verify a specific certificate
./scripts/interact.sh verify GDEVADDRESS... GORGADDRESS... "RUST_BOOTCAMP_2024"
```

## Usage Examples

### JavaScript/TypeScript Integration

```typescript
import { Contract, SorobanRpc, TransactionBuilder, Networks } from '@stellar/stellar-sdk';

// Initialize contract
const contractId = 'YOUR_CONTRACT_ID';
const contract = new Contract(contractId);
const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');

// Mint a certificate
const mintTx = new TransactionBuilder(account, {
  fee: '100',
  networkPassphrase: Networks.TESTNET,
})
.addOperation(
  contract.call(
    'mint_certificate',
    ...[
      developerAddress,
      'STELLAR_DEV_2024',
      'Stellar Development Course',
      Math.floor(Date.now() / 1000)
    ]
  )
)
.setTimeout(300)
.build();

// Sign and submit transaction
mintTx.sign(issuerKeypair);
await server.sendTransaction(mintTx);
```

### Rust Integration

```rust
use soroban_sdk::{Address, Env, String};

// Get contract client
let client = CertificateContractClient::new(&env, &contract_id);

// Mint certificate
let cert_id = client.mint_certificate(
    &developer_address,
    &String::from_str(&env, "HACKATHON_2024"),
    &String::from_str(&env, "Stellar Hackathon 2024"),
    &current_timestamp,
);

// Verify certificate
let is_valid = client.verify_certificate(
    &developer_address,
    &issuer_address,
    &String::from_str(&env, "HACKATHON_2024"),
);
```

## Testing

The contract includes comprehensive tests covering:

- **Certificate lifecycle**: Minting, retrieving, and verifying certificates
- **Authorization**: Testing authorized and unauthorized issuers
- **Multiple certificates**: Handling multiple certificates per developer
- **Issuer revocation**: Testing the revocation of issuer permissions

Run tests with:
```bash
cargo test --features testutils
```

Or use the test script:
```bash
./scripts/test.sh
```

## Deployment Environments

### Testnet Deployment
- RPC URL: `https://soroban-testnet.stellar.org`
- Network Passphrase: `Test SDF Network ; September 2015`
- Requires testnet XLM for transaction fees

### Mainnet Deployment
- RPC URL: `https://soroban-mainnet.stellar.org`
- Network Passphrase: `Public Global Stellar Network ; September 2015`
- Requires mainnet XLM for transaction fees

## Integration with DevChain Platform

### Frontend Integration

Update the Stellar service to interact with the certificate contract:

```typescript
// src/lib/stellar.ts
export class CertificateService {
  private contractId: string;
  private server: SorobanRpc.Server;

  constructor(contractId: string) {
    this.contractId = contractId;
    this.server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');
  }

  async mintCertificate(
    issuerKeypair: Keypair,
    developerAddress: string,
    eventId: string,
    eventName: string
  ): Promise<string> {
    const contract = new Contract(this.contractId);
    const account = await this.server.getAccount(issuerKeypair.publicKey());

    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
    .addOperation(
      contract.call('mint_certificate', ...[
        Address.fromString(developerAddress),
        eventId,
        eventName,
        Math.floor(Date.now() / 1000)
      ])
    )
    .setTimeout(300)
    .build();

    transaction.sign(issuerKeypair);
    const result = await this.server.sendTransaction(transaction);
    return result.hash;
  }

  async getCertificates(developerAddress: string): Promise<Certificate[]> {
    const contract = new Contract(this.contractId);
    const result = await contract.call('get_certificates', Address.fromString(developerAddress));
    return result;
  }
}
```

### API Route Updates

Update the certificate minting API route:

```typescript
// src/app/api/certificates/mint/route.ts
import { CertificateService } from '@/lib/stellar';

const certificateService = new CertificateService(process.env.CERTIFICATE_CONTRACT_ID!);

export async function POST(request: NextRequest) {
  const { recipientPublicKey, eventId, eventName } = await request.json();

  try {
    const transactionHash = await certificateService.mintCertificate(
      issuerKeypair,
      recipientPublicKey,
      eventId,
      eventName
    );

    return NextResponse.json({
      transactionHash,
      message: "Certificate minted successfully"
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to mint certificate" },
      { status: 500 }
    );
  }
}
```

## Security Considerations

1. **Authorization**: Only authorized issuers can mint certificates
2. **Non-transferable**: Certificates cannot be transferred between addresses
3. **Immutable**: Once minted, certificate metadata cannot be changed
4. **Admin controls**: Contract admin can manage issuer permissions
5. **Data validation**: All inputs are validated before processing

## Gas Costs

Estimated XLM costs for operations:
- Contract deployment: ~0.5 XLM
- Initialize contract: ~0.1 XLM
- Authorize issuer: ~0.1 XLM
- Mint certificate: ~0.2 XLM
- Get certificates: ~0.05 XLM (read-only)
- Verify certificate: ~0.05 XLM (read-only)

## Troubleshooting

### Common Issues

1. **"Issuer not authorized"**: Ensure the issuer address is authorized by the admin
2. **"Contract not found"**: Verify the contract ID is correct
3. **"Insufficient balance"**: Ensure the account has enough XLM for fees
4. **"Invalid signature"**: Check that the correct keypair is being used

### Debug Commands

```bash
# Check if contract is deployed
soroban contract id wasm-hash target/wasm32-unknown-unknown/release/certificate_contract.wasm

# Get contract events
soroban events --start-ledger <ledger_number> --contract-ids <contract_id>
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.