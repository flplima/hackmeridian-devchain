import { NextRequest, NextResponse } from "next/server"
import { BlockchainService } from "@/lib/blockchain-service"
import { UserAddressService } from "@/lib/user-address-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const recipientAddress = searchParams.get('recipientAddress')
    const eventId = searchParams.get('eventId')

    if (!organizationId && !recipientAddress) {
      return NextResponse.json(
        { error: "Either organizationId or recipientAddress is required" },
        { status: 400 }
      )
    }

    // Handle recipient address lookup (for developers viewing their badges)
    if (recipientAddress) {
      console.log(`🔍 Fetching badges for recipient address: ${recipientAddress}`)

      try {
        const badges = await BlockchainService.getBadgesByRecipient(recipientAddress)
        return NextResponse.json({
          badges,
          count: badges.length,
          recipientAddress,
          debug: {
            badgesFound: badges.length,
            searchType: 'recipient'
          }
        })
      } catch (error) {
        console.error("Error fetching badges for recipient:", error)
        return NextResponse.json({
          badges: [],
          count: 0,
          recipientAddress,
          error: "Failed to fetch badges from blockchain"
        })
      }
    }

    // Determine organization stellar address
    let organizationAddress: string

    // Check if organizationId is already a Stellar address (starts with G and is 56 chars)
    if (organizationId.startsWith('G') && organizationId.length === 56) {
      console.log(`Using organization ID as direct Stellar address: ${organizationId}`)
      organizationAddress = organizationId
    } else {
      // Try to derive organization stellar address from organization ID
      try {
        organizationAddress = UserAddressService.getOrganizationAddress(
          organizationId,
          process.env.MASTER_TOKEN
        )
        console.log(`Derived organization address: ${organizationAddress} from ID: ${organizationId}`)
      } catch (error) {
        console.error("Error deriving organization address:", error)
        return NextResponse.json(
          { error: "Invalid organization credentials" },
          { status: 401 }
        )
      }
    }

    console.log(`Fetching badges for organization: ${organizationId} -> ${organizationAddress}`)

    if (eventId) {
      // Get badges for a specific event
      const badges = await BlockchainService.getBadgesByEvent(eventId, organizationAddress)
      return NextResponse.json({
        badges,
        count: badges.length,
        organizationAddress,
        eventId
      })
    } else {
      // Get all badges for the organization and count by event
      // First get events to help match full event IDs
      const eventsResponse = await fetch(`${request.nextUrl.origin}/api/events`)
      const eventsData = eventsResponse.ok ? await eventsResponse.json() : null
      const allEvents = eventsData?.events || []

      const [badges, badgeCounts] = await Promise.all([
        BlockchainService.getBadgesByOrganization(organizationAddress),
        BlockchainService.getBadgeCountsByOrganization(organizationAddress, allEvents)
      ])

      return NextResponse.json({
        badges,
        badgeCounts,
        organizationAddress,
        totalCount: badges.length,
        debug: {
          eventsFound: allEvents.length,
          badgesFound: badges.length,
          badgeCounts
        }
      })
    }
  } catch (error) {
    console.error("Error fetching blockchain badges:", error)
    return NextResponse.json(
      { error: "Failed to fetch badges from blockchain" },
      { status: 500 }
    )
  }
}