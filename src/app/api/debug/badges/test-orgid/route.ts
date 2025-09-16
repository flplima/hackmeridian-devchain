import { NextRequest, NextResponse } from "next/server"
import { BlockchainService } from "@/lib/blockchain-service"
import { UserAddressService } from "@/lib/user-address-service"

export async function GET(request: NextRequest) {
  try {
    // Test using the actual issuer address AS the organization ID
    const possibleOrgId = "GCR23HMPNGVYEKTVVGQDTVECMBER6DI7NJBD3EQITKRHEHH7GNHUXSIF"

    console.log(`🔍 DEBUG: Testing with issuer address AS organization ID: ${possibleOrgId}`)

    // Try to derive organization address using the issuer address as org ID
    let derivedAddress: string
    try {
      derivedAddress = UserAddressService.getOrganizationAddress(
        possibleOrgId,
        process.env.MASTER_TOKEN
      )
      console.log(`🔍 DEBUG: When using issuer as org ID, derives to: ${derivedAddress}`)
    } catch (error) {
      console.error("❌ DEBUG: Error deriving address from issuer:", error)
      return NextResponse.json({
        error: "Failed to derive organization address using issuer as org ID",
        issuerAddress: possibleOrgId
      })
    }

    // Check if derived address matches the actual issuer
    const addressesMatch = derivedAddress === possibleOrgId
    console.log(`🔍 DEBUG: Addresses match: ${addressesMatch}`)

    // Get events for context
    const eventsResponse = await fetch(`${request.nextUrl.origin}/api/events`)
    const eventsData = eventsResponse.ok ? await eventsResponse.json() : null
    const allEvents = eventsData?.events || []

    // Get badge counts using this approach
    const badgeCounts = await BlockchainService.getBadgeCountsByOrganization(possibleOrgId, allEvents)

    return NextResponse.json({
      debug: {
        testedOrgId: possibleOrgId,
        derivedAddress,
        addressesMatch,
        solution: addressesMatch ? "✅ Use issuer address as organization ID" : "❌ Still need different approach",
        badgeCounts,
        recommendation: addressesMatch
          ? "The dashboard should use the issuer address as the organization ID"
          : "Need to investigate further why addresses don't match"
      }
    })

  } catch (error) {
    console.error("❌ DEBUG: Error in organization ID test:", error)
    return NextResponse.json({
      error: "Test failed",
      details: error.message
    }, { status: 500 })
  }
}