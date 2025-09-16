import { NextRequest, NextResponse } from "next/server"
import { serverDataStore } from "@/lib/server-data-store"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Get the user's Stellar address from the data store
    const userAddress = await serverDataStore.getUserAddress(userId)

    if (!userAddress) {
      return NextResponse.json(
        { error: "No Stellar address found for this user" },
        { status: 404 }
      )
    }

    console.log(`✅ Found Stellar address for user ${userId}: ${userAddress.stellarAddress}`)

    return NextResponse.json({
      userId: userAddress.userId,
      stellarAddress: userAddress.stellarAddress,
      createdAt: userAddress.createdAt
    })

  } catch (error) {
    console.error("Error fetching user Stellar address:", error)
    return NextResponse.json(
      { error: "Failed to fetch Stellar address" },
      { status: 500 }
    )
  }
}