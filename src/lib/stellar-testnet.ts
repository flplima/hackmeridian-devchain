import {
  Horizon,
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  Account,
  Memo,
} from "@stellar/stellar-sdk"

const server = new Horizon.Server("https://horizon-testnet.stellar.org")
const NETWORK_PASSPHRASE = Networks.TESTNET

export interface Certificate {
  issuer: string
  event_id: string
  event_name: string
  date_issued: number
  transaction_hash?: string
}

export class StellarTestnetService {
  /**
   * Fund an account using Friendbot (testnet only)
   */
  static async fundAccount(publicKey: string): Promise<boolean> {
    try {
      console.log(`💰 Funding account ${publicKey} via Friendbot`)

      const response = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`)
      if (response.ok) {
        console.log(`✅ Account ${publicKey} funded successfully`)
        return true
      } else {
        console.error(`❌ Failed to fund account: ${response.status} ${response.statusText}`)
        return false
      }
    } catch (error) {
      console.error('❌ Error funding account:', error)
      return false
    }
  }

  /**
   * Ensure account exists and is funded
   */
  static async ensureAccountExists(publicKey: string): Promise<boolean> {
    try {
      // Try to load the account
      await server.loadAccount(publicKey)
      console.log(`✅ Account ${publicKey} already exists`)
      return true
    } catch (error) {
      // Account doesn't exist, try to fund it
      console.log(`🔄 Account ${publicKey} doesn't exist, funding via Friendbot`)
      return await this.fundAccount(publicKey)
    }
  }

  /**
   * Create a simple token/payment to represent a certificate
   * Since the smart contract might not be deployed, we'll use a payment with memo
   */
  static async emitCertificatePayment(
    issuerKeypair: Keypair,
    recipientAddress: string,
    eventId: string,
    eventName: string
  ): Promise<string> {
    try {
      console.log(`🚀 Emitting certificate for ${eventName} to ${recipientAddress}`)

      // Ensure both issuer and recipient accounts exist
      const issuerExists = await this.ensureAccountExists(issuerKeypair.publicKey())
      if (!issuerExists) {
        throw new Error(`Failed to create/fund issuer account: ${issuerKeypair.publicKey()}`)
      }

      const recipientExists = await this.ensureAccountExists(recipientAddress)
      if (!recipientExists) {
        throw new Error(`Failed to create/fund recipient account: ${recipientAddress}`)
      }

      // Load issuer account
      const issuerAccount = await server.loadAccount(issuerKeypair.publicKey())

      // Create memo with certificate data (use compact format due to 28 char limit)
      // Use first 8 chars of eventId to fit in memo limit
      const shortEventId = eventId.substring(0, 8)
      const certificateData = `CERT:${shortEventId}`

      // Build transaction with a small XLM payment and memo
      const transaction = new TransactionBuilder(issuerAccount, {
        fee: "10000", // 0.001 XLM
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(Operation.payment({
        destination: recipientAddress,
        asset: Asset.native(),
        amount: "0.0000001", // Minimal XLM amount (1 stroop)
      }))
      .addMemo(Memo.text(certificateData)) // Use compact format that fits in 28 chars
      .setTimeout(300)
      .build()

      // Sign transaction
      transaction.sign(issuerKeypair)

      // Submit to network
      const result = await server.submitTransaction(transaction)

      console.log(`✅ Certificate emitted! Transaction: ${result.hash}`)
      console.log(`🔗 View on testnet: https://stellar.expert/explorer/testnet/tx/${result.hash}`)

      return result.hash
    } catch (error) {
      console.error('❌ Error emitting certificate:', error)
      throw error
    }
  }

  /**
   * Get certificate payments for a user by checking their transaction history
   */
  static async getCertificatesForUser(userAddress: string): Promise<Certificate[]> {
    try {
      console.log(`🔍 Getting certificates for ${userAddress}`)

      const account = await server.loadAccount(userAddress)
      const payments = await server.payments()
        .forAccount(userAddress)
        .order('desc')
        .limit(50)
        .call()

      const certificates: Certificate[] = []

      for (const payment of payments.records) {
        if (payment.type === 'payment') {
          try {
            // Get transaction details to check memo
            const transaction = await server.transactions()
              .transaction(payment.transaction_hash)
              .call()

            if (transaction.memo && transaction.memo.includes('CERTIFICATE')) {
              // This is a certificate payment
              const cert: Certificate = {
                issuer: payment.from || 'unknown',
                event_id: 'extracted_from_memo',
                event_name: 'Certificate Payment',
                date_issued: new Date(payment.created_at).getTime() / 1000,
                transaction_hash: payment.transaction_hash
              }
              certificates.push(cert)
            }
          } catch (error) {
            // Skip invalid memos
            continue
          }
        }
      }

      console.log(`📋 Found ${certificates.length} certificates`)
      return certificates
    } catch (error) {
      console.error('❌ Error getting certificates:', error)
      return []
    }
  }

  /**
   * Verify a transaction exists on the blockchain
   */
  static async verifyTransaction(transactionHash: string): Promise<boolean> {
    try {
      console.log(`🔍 Verifying transaction: ${transactionHash}`)

      const transaction = await server.transactions()
        .transaction(transactionHash)
        .call()

      const isSuccessful = transaction.successful
      console.log(`✅ Transaction verified: ${isSuccessful ? 'SUCCESS' : 'FAILED'}`)

      return isSuccessful
    } catch (error) {
      console.error('❌ Error verifying transaction:', error)
      return false
    }
  }

  /**
   * Get account info and balance
   */
  static async getAccountInfo(address: string) {
    try {
      const account = await server.loadAccount(address)
      const balances = account.balances.map(balance => ({
        asset_type: balance.asset_type,
        balance: balance.balance
      }))

      console.log(`💰 Account ${address} balances:`, balances)
      return { account, balances }
    } catch (error) {
      console.error('❌ Error getting account info:', error)
      throw error
    }
  }
}