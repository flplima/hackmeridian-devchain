#!/usr/bin/env node

/**
 * Test Organization Address Derivation
 *
 * This script tests the organization address derivation functionality
 * to ensure deterministic address generation works correctly.
 */

// For testing, we'll implement the logic directly since we can't import TS files in Node.js
const { Keypair } = require("@stellar/stellar-sdk")
const { createHash } = require("crypto")

// Copy of UserAddressService organization methods for testing
class UserAddressService {
  static deriveOrganizationKeypair(organizationName, masterToken) {
    const token = masterToken || process.env.MASTER_TOKEN
    if (!token) {
      throw new Error("Master token is required for organization key derivation")
    }

    const seedString = `org:${organizationName.toLowerCase().trim()}:${token}`
    const hash = createHash('sha256').update(seedString).digest()
    const seed = hash.slice(0, 32)
    const keypair = Keypair.fromRawEd25519Seed(seed)

    return keypair
  }

  static getOrganizationAddress(organizationName, masterToken) {
    const keypair = this.deriveOrganizationKeypair(organizationName, masterToken)
    return keypair.publicKey()
  }

  static getOrganizationSecret(organizationName, masterToken) {
    const keypair = this.deriveOrganizationKeypair(organizationName, masterToken)
    return keypair.secret()
  }
}

// Test configuration
const TEST_ORGANIZATIONS = [
  "Stellar Development Foundation",
  "stellar development foundation", // Test case insensitivity
  "STELLAR DEVELOPMENT FOUNDATION",
  "Meridian Conference",
  "Hack Meridian",
  "OpenAI",
  "Microsoft",
  "Google"
]

const MASTER_TOKEN = process.env.MASTER_TOKEN || "demo-master-token-123"

async function testOrganizationDerivation() {
  console.log("🧪 Testing Organization Address Derivation")
  console.log("=" .repeat(50))
  console.log(`🔑 Master Token: ${MASTER_TOKEN.slice(0, 8)}...`)
  console.log("=" .repeat(50))

  const results = []

  for (const orgName of TEST_ORGANIZATIONS) {
    try {
      console.log(`\n🏢 Testing organization: "${orgName}"`)

      // Test address derivation
      const address1 = UserAddressService.getOrganizationAddress(orgName, MASTER_TOKEN)
      const address2 = UserAddressService.getOrganizationAddress(orgName, MASTER_TOKEN)

      // Verify deterministic generation (same input = same output)
      const isDeterministic = address1 === address2
      console.log(`   📍 Address: ${address1}`)
      console.log(`   🔄 Deterministic: ${isDeterministic ? '✅' : '❌'}`)

      // Test secret key derivation (should also be deterministic)
      const secret1 = UserAddressService.getOrganizationSecret(orgName, MASTER_TOKEN)
      const secret2 = UserAddressService.getOrganizationSecret(orgName, MASTER_TOKEN)
      const secretDeterministic = secret1 === secret2
      console.log(`   🔐 Secret deterministic: ${secretDeterministic ? '✅' : '❌'}`)

      // Validate Stellar address format
      const validFormat = address1.startsWith('G') && address1.length === 56
      console.log(`   📏 Valid format: ${validFormat ? '✅' : '❌'}`)

      results.push({
        organization: orgName,
        address: address1,
        isDeterministic,
        secretDeterministic,
        validFormat,
        success: isDeterministic && secretDeterministic && validFormat
      })

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`)
      results.push({
        organization: orgName,
        error: error.message,
        success: false
      })
    }
  }

  // Test case sensitivity (should produce same results for same org name in different cases)
  console.log("\n" + "=" .repeat(50))
  console.log("🔤 Testing Case Insensitivity")
  console.log("=" .repeat(50))

  const stellarAddresses = [
    UserAddressService.getOrganizationAddress("Stellar Development Foundation", MASTER_TOKEN),
    UserAddressService.getOrganizationAddress("stellar development foundation", MASTER_TOKEN),
    UserAddressService.getOrganizationAddress("STELLAR DEVELOPMENT FOUNDATION", MASTER_TOKEN),
    UserAddressService.getOrganizationAddress("  stellar development foundation  ", MASTER_TOKEN), // With spaces
  ]

  const allSame = stellarAddresses.every(addr => addr === stellarAddresses[0])
  console.log(`📍 All variations produce same address: ${allSame ? '✅' : '❌'}`)
  console.log(`   Address: ${stellarAddresses[0]}`)

  if (!allSame) {
    console.log("   Variations:")
    stellarAddresses.forEach((addr, i) => console.log(`     ${i + 1}: ${addr}`))
  }

  // Summary
  console.log("\n" + "=" .repeat(50))
  console.log("📊 TEST SUMMARY")
  console.log("=" .repeat(50))

  const successful = results.filter(r => r.success).length
  const total = results.length

  console.log(`✅ Successful tests: ${successful}/${total}`)
  console.log(`🔤 Case insensitivity: ${allSame ? '✅' : '❌'}`)

  if (successful === total && allSame) {
    console.log("\n🎉 ALL TESTS PASSED!")
    console.log("✅ Organization address derivation is working correctly")
    console.log("✅ Addresses are deterministic")
    console.log("✅ Case insensitive normalization works")
    console.log("✅ Stellar address format is valid")
  } else {
    console.log("\n❌ SOME TESTS FAILED!")
    const failed = results.filter(r => !r.success)
    failed.forEach(result => {
      console.log(`❌ ${result.organization}: ${result.error || 'Validation failed'}`)
    })
  }

  // Example usage for badge emission
  console.log("\n" + "=" .repeat(50))
  console.log("💡 EXAMPLE USAGE FOR BADGE EMISSION")
  console.log("=" .repeat(50))

  const exampleOrg = "Stellar Development Foundation"
  const exampleAddress = UserAddressService.getOrganizationAddress(exampleOrg, MASTER_TOKEN)
  const exampleSecret = UserAddressService.getOrganizationSecret(exampleOrg, MASTER_TOKEN)

  console.log(`🏢 Organization: ${exampleOrg}`)
  console.log(`📍 Public Address: ${exampleAddress}`)
  console.log(`🔐 Secret Key: ${exampleSecret.slice(0, 8)}...`)
  console.log(`\n📝 API Request Body:`)
  console.log(`{`)
  console.log(`  "developerAddress": "GB5C4QHWCMS2D6BOOIBGMCEX5KMUJ4D37WVSZYG6SQMEXU7CIH3F4664",`)
  console.log(`  "organizationName": "${exampleOrg}",`)
  console.log(`  "masterToken": "${MASTER_TOKEN}"`)
  console.log(`}`)

  return { successful, total, caseInsensitive: allSame }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testOrganizationDerivation().then(results => {
    process.exit(results.successful === results.total && results.caseInsensitive ? 0 : 1)
  }).catch(error => {
    console.error("❌ Test failed:", error)
    process.exit(1)
  })
}

module.exports = { testOrganizationDerivation }