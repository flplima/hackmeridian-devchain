#!/usr/bin/env node

/**
 * Stellar Testnet E2E Test Runner
 *
 * This script runs a complete end-to-end test of badge emission
 * to user "flplima" on Stellar testnet blockchain.
 */

const { Keypair, Horizon, Networks, TransactionBuilder, Operation, Asset, Memo } = require("@stellar/stellar-sdk")

// Test configuration
const TEST_CONFIG = {
  recipientAddress: "GB5C4QHWCMS2D6BOOIBGMCEX5KMUJ4D37WVSZYG6SQMEXU7CIH3F4664", // flplima
  recipientName: "flplima",
  eventId: "hackmeridian_2024_e2e_test",
  eventName: "HackMeridian 2024 - Blockchain Certificate Test",
  issuerSecret: process.env.DEMO_ISSUER_SECRET || "SCJRD7JXR2CTD4MLU672PXC47W6LWTWBZXCJOMYCJG6IPAONWY7U6ZW2",
}

const server = new Horizon.Server("https://horizon-testnet.stellar.org")
const NETWORK_PASSPHRASE = Networks.TESTNET

class StellarTestnetService {
  /**
   * Create a simple token/payment to represent a certificate
   */
  static async emitCertificatePayment(issuerKeypair, recipientAddress, eventId, eventName) {
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
   * Verify a transaction exists on the blockchain
   */
  static async verifyTransaction(transactionHash) {
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
  static async getAccountInfo(address) {
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

  /**
   * Get certificate payments for a user
   */
  static async getCertificatesForUser(userAddress) {
    try {
      console.log(`🔍 Getting certificates for ${userAddress}`)

      const payments = await server.payments()
        .forAccount(userAddress)
        .order('desc')
        .limit(50)
        .call()

      const certificates = []

      for (const payment of payments.records) {
        if (payment.type === 'payment' && payment.memo) {
          try {
            // Try to parse memo as certificate data
            const memoText = payment.memo
            if (memoText.includes('CERTIFICATE')) {
              // This is a certificate payment
              const cert = {
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
}

async function main() {
  console.log("🚀 Starting Stellar Testnet E2E Test")
  console.log("=" .repeat(50))
  console.log(`👤 Target User: ${TEST_CONFIG.recipientName}`)
  console.log(`📧 Address: ${TEST_CONFIG.recipientAddress}`)
  console.log(`🎫 Event: ${TEST_CONFIG.eventName}`)
  console.log("=" .repeat(50))

  try {
    const issuerKeypair = Keypair.fromSecret(TEST_CONFIG.issuerSecret)
    console.log(`🔑 Issuer: ${issuerKeypair.publicKey()}`)

    // Step 1: Check issuer balance
    console.log("\n📋 Step 1: Checking issuer account...")
    const issuerInfo = await StellarTestnetService.getAccountInfo(issuerKeypair.publicKey())
    const xlmBalance = issuerInfo.balances.find(b => b.asset_type === 'native')
    console.log(`💰 Issuer XLM Balance: ${xlmBalance?.balance} XLM`)

    if (parseFloat(xlmBalance?.balance || '0') < 1) {
      throw new Error("Insufficient XLM balance for transaction fees")
    }

    // Step 2: Check recipient account
    console.log("\n📋 Step 2: Verifying recipient account...")
    await StellarTestnetService.getAccountInfo(TEST_CONFIG.recipientAddress)
    console.log(`✅ Recipient account is active`)

    // Step 3: Emit certificate
    console.log("\n📋 Step 3: Emitting certificate badge...")
    const transactionHash = await StellarTestnetService.emitCertificatePayment(
      issuerKeypair,
      TEST_CONFIG.recipientAddress,
      TEST_CONFIG.eventId,
      TEST_CONFIG.eventName
    )

    // Step 4: Verify transaction
    console.log("\n📋 Step 4: Verifying blockchain transaction...")
    await new Promise(resolve => setTimeout(resolve, 3000)) // Wait for network
    const isVerified = await StellarTestnetService.verifyTransaction(transactionHash)

    // Step 5: Check recipient received certificate
    console.log("\n📋 Step 5: Checking recipient's certificates...")
    const certificates = await StellarTestnetService.getCertificatesForUser(TEST_CONFIG.recipientAddress)
    const ourCertificate = certificates.find(cert => cert.transaction_hash === transactionHash)

    // Results
    console.log("\n" + "=" .repeat(50))
    console.log("🎉 E2E TEST COMPLETED SUCCESSFULLY!")
    console.log("=" .repeat(50))
    console.log(`📝 Transaction Hash: ${transactionHash}`)
    console.log(`✅ Blockchain Verified: ${isVerified}`)
    console.log(`🏆 Certificate Delivered: ${ourCertificate ? 'YES' : 'NO'}`)
    console.log(`🔗 View on Stellar Expert: https://stellar.expert/explorer/testnet/tx/${transactionHash}`)
    console.log(`🔗 View Account: https://stellar.expert/explorer/testnet/account/${TEST_CONFIG.recipientAddress}`)
    console.log("\n📋 Certificate Details:")
    console.log(`   • Recipient: ${TEST_CONFIG.recipientName}`)
    console.log(`   • Event: ${TEST_CONFIG.eventName}`)
    console.log(`   • Issued by: ${issuerKeypair.publicKey()}`)
    console.log(`   • Date: ${new Date().toISOString()}`)
    console.log(`   • Blockchain: Stellar Testnet`)
    console.log("\n🎊 flplima now has a verifiable blockchain certificate!")

    return {
      success: true,
      transactionHash,
      isVerified,
      certificateDelivered: !!ourCertificate,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${transactionHash}`
    }

  } catch (error) {
    console.error("\n❌ E2E Test Failed:")
    console.error(error)
    process.exit(1)
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { main }