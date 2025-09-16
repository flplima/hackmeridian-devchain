import { NextRequest, NextResponse } from "next/server"
import { serverDataStore } from "@/lib/server-data-store"
import { UserAddressService } from "@/lib/user-address-service"

export async function GET() {
  try {
    // Get ALL users - no search, no pagination, no filters
    const users = await serverDataStore.getUsers()

    // Enrich all users with Stellar addresses
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        // Get or create Stellar address for this user using GitHub ID
        let stellarAddress = null
        try {
          stellarAddress = await UserAddressService.getStellarAddressByGithubId(
            user.githubId,
            process.env.MASTER_TOKEN || "demo-master-token-123"
          )
        } catch (error) {
          console.error(`Error generating stellar address for user ${user.id}:`, error)
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          githubHandle: user.githubHandle,
          githubId: user.githubId,
          stellarAddress
        }
      })
    )

    return NextResponse.json({
      users: enrichedUsers
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

// POST endpoint to add/update user (for when users log in)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, githubHandle, profileImage, provider } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      )
    }

    // Create user object with UUID
    const { v4: uuidv4 } = require('uuid')
    const user = {
      id: uuidv4(),
      name,
      email,
      githubHandle,
      profileImage,
      provider: provider || 'github',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    }

    // Add/update user in store
    await serverDataStore.addUser(user)

    // Ensure the user has a Stellar address using GitHub ID
    const stellarAddress = await UserAddressService.getStellarAddressByGithubId(
      user.githubId,
      process.env.MASTER_TOKEN
    )

    return NextResponse.json({
      user: {
        ...user,
        stellarAddress
      },
      message: "User added/updated successfully"
    })
  } catch (error) {
    console.error("Error adding user:", error)
    return NextResponse.json(
      { error: "Failed to add user" },
      { status: 500 }
    )
  }
}