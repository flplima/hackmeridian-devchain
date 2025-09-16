import { NextRequest, NextResponse } from "next/server"
import { serverDataStore } from "@/lib/server-data-store"
import { UserAddressService } from "@/lib/user-address-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      )
    }

    console.log(`🔍 Searching for users with query: "${query}"`)

    // Get all users from the local database
    const allUsers = await serverDataStore.getUsers()

    // Filter users based on the search query (case-insensitive)
    const searchTerm = query.toLowerCase().trim()
    const matchingUsers = allUsers.filter(user =>
      user.name?.toLowerCase().includes(searchTerm) ||
      user.email?.toLowerCase().includes(searchTerm) ||
      user.githubHandle?.toLowerCase().includes(searchTerm)
    )

    console.log(`📋 Found ${matchingUsers.length} matching users out of ${allUsers.length} total`)

    // Enrich matching users with Stellar addresses
    const enrichedUsers = await Promise.all(
      matchingUsers.map(async (user) => {
        let stellarAddress = null
        try {
          if (user.githubId) {
            stellarAddress = await UserAddressService.getStellarAddressByGithubId(
              user.githubId,
              process.env.MASTER_TOKEN || "demo-master-token-123"
            )
          }
        } catch (error) {
          console.error(`Error generating stellar address for user ${user.id}:`, error)
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          githubHandle: user.githubHandle,
          githubId: user.githubId,
          profileImage: user.profileImage,
          stellarAddress
        }
      })
    )

    return NextResponse.json({
      users: enrichedUsers,
      total_count: enrichedUsers.length
    })
  } catch (error) {
    console.error("Error searching local users:", error)
    return NextResponse.json(
      { error: "Failed to search local users" },
      { status: 500 }
    )
  }
}