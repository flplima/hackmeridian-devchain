import { NextRequest, NextResponse } from "next/server"
import { StellarTestnetService } from "@/lib/stellar-testnet"
import { serverDataStore } from "@/lib/server-data-store"
import { UserAddressService } from "@/lib/user-address-service"
import { Keypair } from "@stellar/stellar-sdk"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { developerAddress, organizationId, masterToken, badgeTitle, badgeDescription, imageUrl } = body

    if (!developerAddress) {
      return NextResponse.json(
        { error: "Developer address is required" },
        { status: 400 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      )
    }

    // Get the event details
    const event = await serverDataStore.getEventById(id)
    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      )
    }

    // Handle session-based organization (not stored in datastore)
    let organization

    // First try to get organization from datastore
    organization = await serverDataStore.getOrganizationById(organizationId)

    if (!organization) {
      // If not found in datastore, treat as session-based organization
      console.log(`Organization ${organizationId} not found in datastore, treating as session-based`)
      organization = {
        id: organizationId,
        name: organizationId.includes('@') ? organizationId.split('@')[0] : organizationId,
        description: "Session-based organization"
      }
    }

    // Derive organization keypair from organization UUID and master token
    let issuerKeypair: Keypair
    try {
      issuerKeypair = UserAddressService.deriveOrganizationKeypair(organizationId, masterToken)
      console.log(`Using derived keypair for organization: ${organization.name} (${organizationId})`)
      console.log(`Organization address: ${issuerKeypair.publicKey()}`)
    } catch (error) {
      console.error("Error deriving organization keypair:", error)
      return NextResponse.json(
        { error: "Invalid organization credentials" },
        { status: 401 }
      )
    }

    // Emit the certificate to the Stellar testnet blockchain
    const transactionHash = await StellarTestnetService.emitCertificatePayment(
      issuerKeypair,
      developerAddress,
      event.id,
      event.title,
      {
        title: badgeTitle,
        description: badgeDescription,
        imageUrl: imageUrl
      }
    )

    // Create badge object for response (not stored locally)
    const badge = {
      id: transactionHash,
      eventId: event.id,
      eventTitle: event.title,
      recipientAddress: developerAddress,
      issuerAddress: issuerKeypair.publicKey(),
      transactionHash,
      dateIssued: new Date().toISOString(),
      contractAddress: process.env.CERTIFICATE_CONTRACT_ID || "CBZM3AM3TGQ4OWJY2NCDNVTCNXGS7ZVLPUNXQRSRAEQBTDWPKJKCO2NI",
    }

    // Note: We no longer store badges locally - they are fetched from blockchain

    return NextResponse.json({
      success: true,
      badge,
      transactionHash,
      message: `Badge emitted successfully for event "${event.title}"`
    })
  } catch (error) {
    console.error("Error emitting badge:", error)
    return NextResponse.json(
      { error: "Failed to emit badge" },
      { status: 500 }
    )
  }
}

// Get badges for a specific event from blockchain
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required to fetch badges from blockchain" },
        { status: 400 }
      )
    }

    // Redirect to blockchain badges API
    return NextResponse.redirect(
      new URL(`/api/blockchain/badges?organizationId=${organizationId}&eventId=${id}`, request.url)
    )
  } catch (error) {
    console.error("Error getting badges:", error)
    return NextResponse.json(
      { error: "Failed to get badges" },
      { status: 500 }
    )
  }
}