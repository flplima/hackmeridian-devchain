import { NextResponse } from "next/server"
import { UserAddressService } from "@/lib/user-address-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, masterToken } = body

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Use deterministic address generation
    const stellarAddress = await UserAddressService.getStellarAddressByUserId(
      userId,
      masterToken
    )

    if (!stellarAddress) {
      return NextResponse.json(
        { error: "Failed to create Stellar address" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      publicKey: stellarAddress,
      message: "Stellar account created successfully using deterministic generation"
    })
  } catch (error) {
    console.error("Error setting up user:", error)
    return NextResponse.json(
      { error: "Failed to setup user account" },
      { status: 500 }
    )
  }
}