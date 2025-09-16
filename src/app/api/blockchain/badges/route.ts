import { NextRequest, NextResponse } from "next/server"
import { BlockchainService } from "@/lib/blockchain-service"
import { UserAddressService } from "@/lib/user-address-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const eventId = searchParams.get('eventId')

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      )
    }

    // Derive organization stellar address from organization ID
    let organizationAddress: string
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
      const [badges, badgeCounts] = await Promise.all([
        BlockchainService.getBadgesByOrganization(organizationAddress),
        BlockchainService.getBadgeCountsByOrganization(organizationAddress)
      ])

      return NextResponse.json({
        badges,
        badgeCounts,
        organizationAddress,
        totalCount: badges.length
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