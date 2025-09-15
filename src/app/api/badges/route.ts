import { NextRequest, NextResponse } from "next/server"
import { serverDataStore, Badge } from "@/lib/server-data-store"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const recipientEmail = searchParams.get('recipientEmail')

    let badges: Badge[]

    if (eventId) {
      badges = serverDataStore.getBadgesByEvent(eventId)
    } else if (recipientEmail) {
      badges = serverDataStore.getBadgesByRecipient(recipientEmail)
    } else {
      badges = serverDataStore.getBadges()
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
    const { recipientName, recipientEmail, eventId } = body

    if (!recipientName || !recipientEmail || !eventId) {
      return NextResponse.json(
        { error: "recipientName, recipientEmail, and eventId are required" },
        { status: 400 }
      )
    }

    // Verify event exists
    const event = serverDataStore.getEventById(eventId)
    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      )
    }

    const badge: Badge = {
      id: `badge_${Date.now()}`,
      recipientName,
      recipientEmail,
      issuedAt: new Date().toISOString(),
      eventId,
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