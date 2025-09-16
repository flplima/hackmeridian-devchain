import { NextRequest, NextResponse } from "next/server"
import { serverDataStore, Badge } from "@/lib/server-data-store"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const recipientAddress = searchParams.get('recipientAddress')

    let badges: Badge[]

    if (eventId) {
      badges = await serverDataStore.getBadgesByEvent(eventId)
    } else if (recipientAddress) {
      badges = await serverDataStore.getBadgesByRecipient(recipientAddress)
    } else {
      badges = await serverDataStore.getBadges()
    }

    return NextResponse.json({ badges })
  } catch (error) {
    console.error("Error fetching badges:", error)
    return NextResponse.json(
      { error: "Failed to fetch badges" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipientAddress, eventId } = body
    // const { issuerSecretKey } = body // TODO: Implement badge signing with issuer key

    if (!recipientAddress || !eventId) {
      return NextResponse.json(
        { error: "recipientAddress and eventId are required" },
        { status: 400 }
      )
    }

    // Verify event exists
    const event = await serverDataStore.getEventById(eventId)
    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      )
    }

    // This route is deprecated - use /api/events/[id]/emit-badge instead
    // For backwards compatibility, create a basic badge record
    const badge: Badge = {
      id: `badge_${Date.now()}`,
      eventId,
      eventTitle: event.title,
      recipientAddress,
      issuerAddress: "DEPRECATED",
      transactionHash: "DEPRECATED",
      dateIssued: new Date().toISOString(),
      contractAddress: "DEPRECATED",
    }

    serverDataStore.addBadge(badge)

    return NextResponse.json({
      badge,
      message: "Badge emitted successfully"
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating badge:", error)
    return NextResponse.json(
      { error: "Failed to emit badge" },
      { status: 500 }
    )
  }
}