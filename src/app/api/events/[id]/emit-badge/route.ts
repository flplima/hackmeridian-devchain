import { NextRequest, NextResponse } from "next/server"
import { CertificateService } from "@/lib/stellar"
import { serverDataStore } from "@/lib/server-data-store"
import { Keypair } from "@stellar/stellar-sdk"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { developerAddress, issuerSecretKey } = body

    if (!developerAddress) {
      return NextResponse.json(
        { error: "Developer address is required" },
        { status: 400 }
      )
    }

    // Get the event details
    const event = serverDataStore.getEventById(id)
    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      )
    }

    // For demo, use a test issuer or provided secret key
    // In production, this would be retrieved from secure storage based on authenticated org
    const issuerKeypair = issuerSecretKey
      ? Keypair.fromSecret(issuerSecretKey)
      : Keypair.fromSecret("SCDQHQ7YI5PTFVNVJN5QWXQOBVJ4B2PVVFFYZBDGYGZ3KUJJCKXDH5BH") // Demo key

    // Mint the certificate using the smart contract
    const transactionHash = await CertificateService.mintCertificate(
      issuerKeypair,
      developerAddress,
      event.id,
      event.title
    )

    // Store badge information in local database
    const badge = {
      id: `badge_${Date.now()}`,
      eventId: event.id,
      eventTitle: event.title,
      recipientAddress: developerAddress,
      issuerAddress: issuerKeypair.publicKey(),
      transactionHash,
      dateIssued: new Date().toISOString(),
      contractAddress: process.env.CERTIFICATE_CONTRACT_ID || "CBZM3AM3TGQ4OWJY2NCDNVTCNXGS7ZVLPUNXQRSRAEQBTDWPKJKCO2NI",
    }

    serverDataStore.addBadge(badge)

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

// Get badges for a specific event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const developerAddress = searchParams.get('developer')

    if (developerAddress) {
      // Get badges for specific developer from this event
      const badges = serverDataStore.getBadgesByEvent(id).filter(
        badge => badge.recipientAddress === developerAddress
      )
      return NextResponse.json({ badges })
    } else {
      // Get all badges for this event
      const badges = serverDataStore.getBadgesByEvent(id)
      return NextResponse.json({ badges, count: badges.length })
    }
  } catch (error) {
    console.error("Error getting badges:", error)
    return NextResponse.json(
      { error: "Failed to get badges" },
      { status: 500 }
    )
  }
}