import {
  Horizon,
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  Contract,
  SorobanRpc,
  Address,
  Account,
} from "@stellar/stellar-sdk"

const server = new Horizon.Server("https://horizon-testnet.stellar.org")
const sorobanServer = new SorobanRpc.Server("https://soroban-testnet.stellar.org")

// Smart contract configuration
const CONTRACT_ID = process.env.CERTIFICATE_CONTRACT_ID || "CBZM3AM3TGQ4OWJY2NCDNVTCNXGS7ZVLPUNXQRSRAEQBTDWPKJKCO2NI"
const NETWORK_PASSPHRASE = Networks.TESTNET

export interface Certificate {
  issuer: string
  event_id: string
  event_name: string
  date_issued: number
}

export interface CertificateMetadata {
  issuer: string
  type: "course" | "hackathon" | "job"
  tags: string[]
  title: string
  dateIssued: string
}

export class CertificateService {
  /**
   * Mint a certificate using the smart contract
   */
  static async mintCertificate(
    issuerKeypair: Keypair,
    developerAddress: string,
    eventId: string,
    eventName: string
  ): Promise<string> {
    try {
      const contract = new Contract(CONTRACT_ID)
      const account = await server.loadAccount(issuerKeypair.publicKey())

      const transaction = new TransactionBuilder(account, {
        fee: "1000000", // 0.1 XLM max fee
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(
        contract.call('mint_certificate',
          Address.fromString(issuerKeypair.publicKey()),
          Address.fromString(developerAddress),
          eventId,
          eventName,
          Math.floor(Date.now() / 1000)
        )
      )
      .setTimeout(300)
      .build()

      // Simulate first to estimate fees
      const simulated = await sorobanServer.simulateTransaction(transaction)
      if (SorobanRpc.Api.isSimulationError(simulated)) {
        throw new Error(`Simulation failed: ${simulated.error}`)
      }

      // Build the final transaction
      const prepared = SorobanRpc.assembleTransaction(transaction, simulated)
      prepared.sign(issuerKeypair)

      const result = await sorobanServer.sendTransaction(prepared)
      return result.hash
    } catch (error) {
      console.error("Error minting certificate:", error)
      throw error
    }
  }

  /**
   * Get all certificates for a developer from smart contract
   */
  static async getCertificates(developerAddress: string): Promise<Certificate[]> {
    try {
      const contract = new Contract(CONTRACT_ID)

      // Create a dummy account for read operations
      const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0')

      const transaction = new TransactionBuilder(dummyAccount, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(
        contract.call('get_certificates', Address.fromString(developerAddress))
      )
      .setTimeout(300)
      .build()

      const simulated = await sorobanServer.simulateTransaction(transaction)
      if (SorobanRpc.Api.isSimulationError(simulated)) {
        console.error(`Failed to get certificates: ${simulated.error}`)
        return []
      }

      // Parse the result
      return this.parseCertificates(simulated.result?.retval)
    } catch (error) {
      console.error("Error getting certificates:", error)
      return []
    }
  }

  /**
   * Verify if a developer has a specific certificate
   */
  static async verifyCertificate(
    developerAddress: string,
    issuerAddress: string,
    eventId: string
  ): Promise<boolean> {
    try {
      const contract = new Contract(CONTRACT_ID)
      const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0')

      const transaction = new TransactionBuilder(dummyAccount, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(
        contract.call('verify_certificate',
          Address.fromString(developerAddress),
          Address.fromString(issuerAddress),
          eventId
        )
      )
      .setTimeout(300)
      .build()

      const simulated = await sorobanServer.simulateTransaction(transaction)
      if (SorobanRpc.Api.isSimulationError(simulated)) {
        return false
      }

      // Parse boolean result
      return simulated.result?.retval?.valueOf() === true
    } catch (error) {
      console.error("Error verifying certificate:", error)
      return false
    }
  }

  private static parseCertificates(retval: any): Certificate[] {
    try {
      if (!retval || !Array.isArray(retval)) {
        return []
      }

      return retval.map((cert: any) => ({
        issuer: cert.issuer?.toString() || '',
        event_id: cert.event_id || '',
        event_name: cert.event_name || '',
        date_issued: cert.date_issued || 0,
      }))
    } catch (error) {
      console.error('Error parsing certificates:', error)
      return []
    }
  }
}

export class StellarService {
  static async createAccount(): Promise<Keypair> {
    const keypair = Keypair.random()

    try {
      await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(
          keypair.publicKey()
        )}`
      )
      return keypair
    } catch (error) {
      console.error("Error funding account:", error)
      throw error
    }
  }

  static async getAccountBalance(publicKey: string): Promise<string> {
    try {
      const account = await server.loadAccount(publicKey)
      const balance = account.balances.find(
        (balance) => balance.asset_type === "native"
      )
      return balance ? balance.balance : "0"
    } catch (error) {
      console.error("Error getting account balance:", error)
      return "0"
    }
  }

  static async mintCertificate(
    issuerKeypair: Keypair,
    recipientPublicKey: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _metadata: CertificateMetadata
  ): Promise<string> {
    try {
      const issuerAccount = await server.loadAccount(issuerKeypair.publicKey())

      const certificateAsset = new Asset(
        `CERT_${Date.now()}`,
        issuerKeypair.publicKey()
      )

      const transaction = new TransactionBuilder(issuerAccount, {
        fee: "100",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.changeTrust({
            asset: certificateAsset,
            source: recipientPublicKey,
          })
        )
        .addOperation(
          Operation.payment({
            destination: recipientPublicKey,
            asset: certificateAsset,
            amount: "1",
          })
        )
        .addOperation(
          Operation.setOptions({
            setFlags: 2,
            source: issuerKeypair.publicKey(),
          })
        )
        .setTimeout(30)
        .build()

      transaction.sign(issuerKeypair)

      const result = await server.submitTransaction(transaction)
      return result.hash
    } catch (error) {
      console.error("Error minting certificate:", error)
      throw error
    }
  }

  static async getCertificates(publicKey: string): Promise<Array<{
    asset_type: string
    asset_code?: string
    balance: string
  }>> {
    try {
      const account = await server.loadAccount(publicKey)
      return account.balances.filter(
        (balance) =>
          balance.asset_type !== "native" &&
          balance.asset_type !== "liquidity_pool_shares" &&
          "asset_code" in balance &&
          balance.asset_code?.startsWith("CERT_")
      )
    } catch (error) {
      console.error("Error getting certificates:", error)
      return []
    }
  }
}

export class EscrowService {
  static async createEscrowContract(
    employerKeypair: Keypair,
    developerPublicKey: string,
    amount: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _jobId: string
  ): Promise<string> {
    try {
      const employerAccount = await server.loadAccount(employerKeypair.publicKey())

      const escrowKeypair = Keypair.random()

      await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(
          escrowKeypair.publicKey()
        )}`
      )

      const createEscrowTransaction = new TransactionBuilder(employerAccount, {
        fee: "100",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: escrowKeypair.publicKey(),
            asset: Asset.native(),
            amount: amount,
          })
        )
        .setTimeout(30)
        .build()

      createEscrowTransaction.sign(employerKeypair)

      await server.submitTransaction(createEscrowTransaction)
      return escrowKeypair.publicKey()
    } catch (error) {
      console.error("Error creating escrow:", error)
      throw error
    }
  }

  static async releaseEscrow(
    escrowKeypair: Keypair,
    developerPublicKey: string
  ): Promise<string> {
    try {
      const escrowAccount = await server.loadAccount(escrowKeypair.publicKey())

      const balance = escrowAccount.balances.find(
        (balance) => balance.asset_type === "native"
      )

      if (!balance) throw new Error("No balance found")

      const releaseTransaction = new TransactionBuilder(escrowAccount, {
        fee: "100",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: developerPublicKey,
            asset: Asset.native(),
            amount: (parseFloat(balance.balance) - 0.0001).toString(),
          })
        )
        .setTimeout(30)
        .build()

      releaseTransaction.sign(escrowKeypair)

      const result = await server.submitTransaction(releaseTransaction)
      return result.hash
    } catch (error) {
      console.error("Error releasing escrow:", error)
      throw error
    }
  }
}