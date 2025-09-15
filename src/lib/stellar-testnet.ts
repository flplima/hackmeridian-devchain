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

      // Load issuer account
      const issuerAccount = await server.loadAccount(issuerKeypair.publicKey())

      // Create memo with certificate data
      const certificateData = JSON.stringify({
        type: "CERTIFICATE",
        event_id: eventId,
        event_name: eventName,
        recipient: recipientAddress,
        issued_at: new Date().toISOString()
      })

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
      .addMemo(Memo.text(certificateData.slice(0, 28))) // Stellar memo limit
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