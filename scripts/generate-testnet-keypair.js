#!/usr/bin/env node

const { Keypair } = require("@stellar/stellar-sdk")

// Generate a new keypair for testing
const keypair = Keypair.random()

console.log("🔑 Generated new Stellar testnet keypair:")
console.log(`Public Key:  ${keypair.publicKey()}`)
console.log(`Secret Key:  ${keypair.secret()}`)
console.log("")
console.log("💡 To fund this account on testnet, visit:")
console.log(`https://laboratory.stellar.org/#account-creator?network=test`)
console.log("")
console.log("🔗 Or use the direct funding URL:")
console.log(`https://friendbot.stellar.org?addr=${keypair.publicKey()}`)
console.log("")
console.log("📝 Add this to your .env.local file:")
console.log(`DEMO_ISSUER_SECRET=${keypair.secret()}`)
console.log(`DEMO_ISSUER_PUBLIC=${keypair.publicKey()}`)