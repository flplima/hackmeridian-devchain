import { NextResponse } from "next/server"
import { StellarService } from "@/lib/stellar"

export async function POST() {
  try {
    // Simplified for now - remove auth check
    // const session = await auth()

    // if (!session || !session.user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const keypair = await StellarService.createAccount()

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