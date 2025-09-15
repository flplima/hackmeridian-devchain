/**
 * End-to-End Test: Stellar Testnet Badge Emission
 *
 * This test performs a real blockchain transaction on Stellar testnet:
 * 1. Emit a certificate/badge for user "flplima"
 * 2. Verify the transaction on the blockchain
 * 3. Check that the recipient received the certificate
 */

import { Keypair } from "@stellar/stellar-sdk"
import { StellarTestnetService } from "../src/lib/stellar-testnet"

// Test configuration
const TEST_CONFIG = {
  // Target user
  recipientAddress: "GB5C4QHWCMS2D6BOOIBGMCEX5KMUJ4D37WVSZYG6SQMEXU7CIH3F4664", // flplima
  recipientName: "flplima",

  // Event details
  eventId: "hackmeridian_2024_test",
  eventName: "HackMeridian 2024 - E2E Test Event",

  // Issuer (this should be a testnet account with XLM)
  // For testing, using the demo issuer from env
  issuerSecret: process.env.DEMO_ISSUER_SECRET || "SCDQHQ7YI5PTFVNVJN5QWXQOBVJ4B2PVVFFYZBDGYGZ3KUJJCKXDH5BH",
}

describe("Stellar Testnet E2E Test", () => {
  let issuerKeypair: Keypair
  let transactionHash: string

  beforeAll(() => {
    // Initialize issuer keypair
    issuerKeypair = Keypair.fromSecret(TEST_CONFIG.issuerSecret)
    console.log(`🔑 Issuer address: ${issuerKeypair.publicKey()}`)
    console.log(`🎯 Target recipient: ${TEST_CONFIG.recipientAddress} (${TEST_CONFIG.recipientName})`)
    console.log(`🎫 Event: ${TEST_CONFIG.eventName}`)
  })

  test("1. Verify issuer account has sufficient balance", async () => {
    console.log("\n=== Step 1: Verify Issuer Account ===")

    const accountInfo = await StellarTestnetService.getAccountInfo(issuerKeypair.publicKey())

    expect(accountInfo).toBeDefined()
    expect(accountInfo.balances).toBeDefined()

    // Check XLM balance
    const xlmBalance = accountInfo.balances.find(b => b.asset_type === 'native')
    expect(xlmBalance).toBeDefined()
    expect(parseFloat(xlmBalance!.balance)).toBeGreaterThan(1) // At least 1 XLM for fees

    console.log(`✅ Issuer has sufficient balance: ${xlmBalance!.balance} XLM`)
  }, 30000)

  test("2. Verify recipient account exists", async () => {
    console.log("\n=== Step 2: Verify Recipient Account ===")

    try {
      const accountInfo = await StellarTestnetService.getAccountInfo(TEST_CONFIG.recipientAddress)
      expect(accountInfo).toBeDefined()
      console.log(`✅ Recipient account exists and is active`)
    } catch (error) {
      console.error(`❌ Recipient account not found or inactive:`, error)
      throw new Error("Recipient account must exist and be active on testnet")
    }
  }, 30000)

  test("3. Emit certificate badge to flplima", async () => {
    console.log("\n=== Step 3: Emit Certificate Badge ===")

    // Emit certificate using real blockchain transaction
    transactionHash = await StellarTestnetService.emitCertificatePayment(
      issuerKeypair,
      TEST_CONFIG.recipientAddress,
      TEST_CONFIG.eventId,
      TEST_CONFIG.eventName
    )

    expect(transactionHash).toBeDefined()
    expect(transactionHash).toHaveLength(64) // Stellar transaction hash length

    console.log(`✅ Certificate emitted successfully!`)
    console.log(`📝 Transaction Hash: ${transactionHash}`)
    console.log(`🔗 Stellar Expert: https://stellar.expert/explorer/testnet/tx/${transactionHash}`)
  }, 30000)

  test("4. Verify transaction on blockchain", async () => {
    console.log("\n=== Step 4: Verify Transaction on Blockchain ===")

    expect(transactionHash).toBeDefined()

    // Verify transaction exists and was successful
    const isVerified = await StellarTestnetService.verifyTransaction(transactionHash)

    expect(isVerified).toBe(true)
    console.log(`✅ Transaction verified on blockchain`)
  }, 30000)

  test("5. Check recipient received the certificate", async () => {
    console.log("\n=== Step 5: Check Recipient Certificate ===")

    // Wait a moment for the transaction to be processed
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Get certificates for the recipient
    const certificates = await StellarTestnetService.getCertificatesForUser(TEST_CONFIG.recipientAddress)

    expect(certificates).toBeDefined()
    expect(certificates.length).toBeGreaterThan(0)

    // Find our specific certificate
    const ourCertificate = certificates.find(cert => cert.transaction_hash === transactionHash)
    expect(ourCertificate).toBeDefined()
    expect(ourCertificate!.issuer).toBe(issuerKeypair.publicKey())

    console.log(`✅ Certificate found in recipient's transaction history`)
    console.log(`📋 Certificate details:`, {
      issuer: ourCertificate!.issuer,
      transaction: ourCertificate!.transaction_hash,
      date_issued: new Date(ourCertificate!.date_issued * 1000).toISOString()
    })
  }, 30000)

  test("6. Generate test summary", async () => {
    console.log("\n=== TEST SUMMARY ===")
    console.log(`👤 Recipient: ${TEST_CONFIG.recipientName} (${TEST_CONFIG.recipientAddress})`)
    console.log(`🏢 Issuer: ${issuerKeypair.publicKey()}`)
    console.log(`🎫 Event: ${TEST_CONFIG.eventName}`)
    console.log(`📝 Transaction: ${transactionHash}`)
    console.log(`🔗 Blockchain Explorer: https://stellar.expert/explorer/testnet/tx/${transactionHash}`)
    console.log(`\n✅ End-to-end test completed successfully!`)
    console.log(`🎉 flplima has been awarded a verifiable blockchain certificate!`)
  })
})

// Helper function to run the test manually
export async function runE2ETest() {
  try {
    console.log("🚀 Starting Stellar Testnet E2E Test...")

    const issuerKeypair = Keypair.fromSecret(TEST_CONFIG.issuerSecret)

    // Step 1: Emit certificate
    console.log("\n1. Emitting certificate...")
    const txHash = await StellarTestnetService.emitCertificatePayment(
      issuerKeypair,
      TEST_CONFIG.recipientAddress,
      TEST_CONFIG.eventId,
      TEST_CONFIG.eventName
    )

    // Step 2: Verify transaction
    console.log("\n2. Verifying transaction...")
    const isVerified = await StellarTestnetService.verifyTransaction(txHash)

    // Step 3: Check recipient certificates
    console.log("\n3. Checking recipient certificates...")
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for processing
    const certificates = await StellarTestnetService.getCertificatesForUser(TEST_CONFIG.recipientAddress)

    console.log("\n✅ E2E Test Results:")
    console.log(`Transaction Hash: ${txHash}`)
    console.log(`Verified: ${isVerified}`)
    console.log(`Certificates found: ${certificates.length}`)
    console.log(`Explorer: https://stellar.expert/explorer/testnet/tx/${txHash}`)

    return { txHash, isVerified, certificates }
  } catch (error) {
    console.error("❌ E2E Test failed:", error)
    throw error
  }
}