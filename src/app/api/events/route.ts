import { NextRequest, NextResponse } from "next/server"
import { serverDataStore, Event } from "@/lib/server-data-store"

export async function GET() {
  try {
    const events = serverDataStore.getEvents()
    return NextResponse.json({ events })
  } catch (error) {
    console.error("Error fetching events:", error)
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, tags } = body

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    const event: Event = {
      id: `event_${Date.now()}`,
      title,
      tags: tags || [],
    }

    serverDataStore.addEvent(event)

    return NextResponse.json({
      event,
      message: "Event created successfully"
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating event:", error)
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    )
  }
}