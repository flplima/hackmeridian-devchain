import { NextRequest, NextResponse } from "next/server"
import { UserAddressService } from "@/lib/user-address-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const masterToken = searchParams.get('masterToken')

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      )
    }

    const stellarAddress = await UserAddressService.getStellarAddressByUserId(
      userId,
      masterToken || undefined
    )

    if (!stellarAddress) {
      return NextResponse.json(
        { error: "Failed to get or create Stellar address" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      userId,
      stellarAddress,
      message: "Stellar address retrieved successfully"
    })
  } catch (error) {
    console.error("Error getting user address:", error)
    return NextResponse.json(
      { error: "Failed to get user address" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, stellarAddress, masterToken } = body

    if (!userId || !stellarAddress || !masterToken) {
      return NextResponse.json(
        { error: "userId, stellarAddress, and masterToken are required" },
        { status: 400 }
      )
    }

    const success = await UserAddressService.setUserAddress(
      userId,
      stellarAddress,
      masterToken
    )

    if (!success) {
      return NextResponse.json(
        { error: "Failed to set user address" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      userId,
      stellarAddress,
      message: "Stellar address set successfully"
    })
  } catch (error) {
    console.error("Error setting user address:", error)
    return NextResponse.json(
      { error: "Failed to set user address" },
      { status: 500 }
    )
  }
}