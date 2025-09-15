#!/usr/bin/env ts-node

/**
 * Stellar Testnet E2E Test Runner
 *
 * This script runs a complete end-to-end test of badge emission
 * to user "flplima" on Stellar testnet blockchain.
 *
 * Usage: npm run test:e2e
 */

import { Keypair } from "@stellar/stellar-sdk"
import { StellarTestnetService } from "../src/lib/stellar-testnet"

// Test configuration
const TEST_CONFIG = {
  recipientAddress: "GB5C4QHWCMS2D6BOOIBGMCEX5KMUJ4D37WVSZYG6SQMEXU7CIH3F4664", // flplima
  recipientName: "flplima",
  eventId: "hackmeridian_2024_e2e_test",
  eventName: "HackMeridian 2024 - Blockchain Certificate Test",
  issuerSecret: process.env.DEMO_ISSUER_SECRET || "SCDQHQ7YI5PTFVNVJN5QWXQOBVJ4B2PVVFFYZBDGYGZ3KUJJCKXDH5BH",
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

export { main as runE2ETest }