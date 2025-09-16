import { NextRequest, NextResponse } from "next/server"
import { BlockchainService } from "@/lib/blockchain-service"

export async function GET(request: NextRequest) {
  try {
    // Use the actual issuer address from the badge response
    const actualIssuerAddress = "GCR23HMPNGVYEKTVVGQDTVECMBER6DI7NJBD3EQITKRHEHH7GNHUXSIF"

    console.log(`🔍 DEBUG: Looking for badges from actual issuer: ${actualIssuerAddress}`)

    // Get badges from the actual issuer address
    const badges = await BlockchainService.getBadgesByOrganization(actualIssuerAddress)
    console.log(`🔍 DEBUG: Found ${badges.length} badges from actual issuer:`, badges)

    // Get events for matching
    const eventsResponse = await fetch(`${request.nextUrl.origin}/api/events`)
    const eventsData = eventsResponse.ok ? await eventsResponse.json() : null
    const allEvents = eventsData?.events || []

    // Get badge counts with event matching
    const badgeCounts = await BlockchainService.getBadgeCountsByOrganization(actualIssuerAddress, allEvents)
    console.log(`🔍 DEBUG: Badge counts from actual issuer:`, badgeCounts)

    return NextResponse.json({
      debug: {
        actualIssuerAddress,
        badgesFound: badges.length,
        badges: badges.map(b => ({
          eventId: b.eventId,
          eventTitle: b.eventTitle,
          transactionHash: b.transactionHash,
          recipientAddress: b.recipientAddress,
          dateIssued: b.dateIssued
        })),
        eventsFound: allEvents.length,
        badgeCounts,
        message: badges.length > 0 ? "✅ Found badges from actual issuer!" : "❌ No badges found even from actual issuer"
      }
    })

  } catch (error) {
    console.error("❌ DEBUG: Error in actual address debug:", error)
    return NextResponse.json({
      error: "Debug failed",
      details: error.message
    }, { status: 500 })
  }
}