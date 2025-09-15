import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { StellarService } from "@/lib/stellar"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const keypair = await StellarService.createAccount()

    const userData = {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
      provider: session.provider || "unknown",
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    }

    return NextResponse.json({
      publicKey: keypair.publicKey(),
      message: "Stellar account created successfully"
    })
  } catch (error) {
    console.error("Error setting up user:", error)
    return NextResponse.json(
      { error: "Failed to setup user account" },
      { status: 500 }
    )
  }
}