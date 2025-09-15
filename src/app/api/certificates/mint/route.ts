import { NextRequest, NextResponse } from "next/server"
import { CertificateService } from "@/lib/stellar"
import { Keypair } from "@stellar/stellar-sdk"

export async function POST(request: NextRequest) {
  try {
    // Simplified for now - remove auth check
    // const session = await auth()

    // if (!session || !session.user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    // if (session.provider !== "linkedin") {
    //   return NextResponse.json(
    //     { error: "Only organizations can mint certificates" },
    //     { status: 403 }
    //   )
    // }

    const body = await request.json()
    const { recipientPublicKey, eventId, eventName, issuerSecretKey } = body

    if (!recipientPublicKey || !eventId || !eventName) {
      return NextResponse.json(
        { error: "Missing required fields: recipientPublicKey, eventId, eventName" },
        { status: 400 }
      )
    }

    // For demo purposes, create a test issuer keypair
    // In production, this would come from secure storage or session
    const issuerKeypair = issuerSecretKey
      ? Keypair.fromSecret(issuerSecretKey)
      : Keypair.random()

    const transactionHash = await CertificateService.mintCertificate(
      issuerKeypair,
      recipientPublicKey,
      eventId,
      eventName
    )

    return NextResponse.json({
      transactionHash,
      issuer: issuerKeypair.publicKey(),
      eventId,
      eventName,
      message: "Certificate minted successfully on smart contract"
    })
  } catch (error) {
    console.error("Error minting certificate:", error)
    return NextResponse.json(
      { error: "Failed to mint certificate" },
      { status: 500 }
    )
  }
}