import { NextRequest, NextResponse } from "next/server"
import { serverDataStore, Event } from "@/lib/server-data-store"

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
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      tags: tags || [],
    }

    await serverDataStore.addEvent(event)
    console.log(`✅ Event created: ${event.title} (ID: ${event.id})`)

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