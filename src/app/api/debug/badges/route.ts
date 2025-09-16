import { NextRequest, NextResponse } from "next/server"
import { BlockchainService } from "@/lib/blockchain-service"
import { UserAddressService } from "@/lib/user-address-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId required" }, { status: 400 })
    }

    console.log(`🔍 DEBUG: Starting badge debug for organization: ${organizationId}`)

    // Step 1: Derive organization address
    let organizationAddress: string
    try {
      organizationAddress = UserAddressService.getOrganizationAddress(
        organizationId,
        process.env.MASTER_TOKEN
      )
      console.log(`🔍 DEBUG: Derived address: ${organizationAddress}`)
    } catch (error) {
      console.error("❌ DEBUG: Error deriving address:", error)
      return NextResponse.json({
        error: "Failed to derive organization address",
        organizationId,
        step: "derive_address"
      })
    }

    // Step 2: Get raw blockchain badges
    console.log(`🔍 DEBUG: Fetching badges from blockchain...`)
    const badges = await BlockchainService.getBadgesByOrganization(organizationAddress)
    console.log(`🔍 DEBUG: Found ${badges.length} badges:`, badges)

    // Step 3: Get events for matching
    const eventsResponse = await fetch(`${request.nextUrl.origin}/api/events`)
    const eventsData = eventsResponse.ok ? await eventsResponse.json() : null
    const allEvents = eventsData?.events || []
    console.log(`🔍 DEBUG: Found ${allEvents.length} events:`, allEvents.map(e => ({ id: e.id, title: e.title })))

    // Step 4: Get badge counts with event matching
    const badgeCounts = await BlockchainService.getBadgeCountsByOrganization(organizationAddress, allEvents)
    console.log(`🔍 DEBUG: Badge counts:`, badgeCounts)

    // Step 5: Check specific transaction
    const targetTxHash = "9ff1044f6285dc2d9ce2d2de90f47b5de01860810e5b404ed6c544769ff57407"
    const txExists = await BlockchainService.verifyBadge(targetTxHash)
    console.log(`🔍 DEBUG: Transaction ${targetTxHash} exists: ${txExists}`)

    return NextResponse.json({
      debug: {
        organizationId,
        organizationAddress,
        badgesFound: badges.length,
        badges: badges.map(b => ({
          eventId: b.eventId,
          eventTitle: b.eventTitle,
          transactionHash: b.transactionHash,
          recipientAddress: b.recipientAddress
        })),
        eventsFound: allEvents.length,
        events: allEvents.map(e => ({ id: e.id, title: e.title })),
        badgeCounts,
        targetTransactionExists: txExists,
        targetTxHash
      }
    })

  } catch (error) {
    console.error("❌ DEBUG: Error in debug endpoint:", error)
    return NextResponse.json({
      error: "Debug failed",
      details: error.message
    }, { status: 500 })
  }
}