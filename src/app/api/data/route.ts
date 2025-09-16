import { NextResponse } from "next/server"
import { serverDataStore } from "@/lib/server-data-store"

export async function GET() {
  try {
    const data = {
      events: await serverDataStore.getEvents(),
      badges: await serverDataStore.getBadges(),
      jobs: await serverDataStore.getJobs(),
      userAddresses: await serverDataStore.getAllUserAddresses(),
      users: await serverDataStore.getUsers(),
      organizations: await serverDataStore.getOrganizations()
    }

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
      counts: {
        events: data.events.length,
        badges: data.badges.length,
        jobs: data.jobs.length,
        userAddresses: data.userAddresses.length,
        users: data.users.length,
        organizations: data.organizations.length
      }
    })
  } catch (error) {
    console.error("Error fetching server data:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch server data",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}