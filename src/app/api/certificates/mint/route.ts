import { NextRequest, NextResponse } from "next/server"
import { StellarService, CertificateMetadata } from "@/lib/stellar"
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
    const { recipientPublicKey, type, tags, title } = body

    if (!recipientPublicKey || !type || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const issuerKeypair = Keypair.random()
    await StellarService.createAccount()

    const metadata: CertificateMetadata = {
      issuer: issuerKeypair.publicKey(),
      type,
      tags: tags || [],
      title,
      dateIssued: new Date().toISOString(),
    }

    const transactionHash = await StellarService.mintCertificate(
      issuerKeypair,
      recipientPublicKey,
      metadata
    )

    return NextResponse.json({
      transactionHash,
      metadata,
      message: "Certificate minted successfully"
    })
  } catch (error) {
    console.error("Error minting certificate:", error)
    return NextResponse.json(
      { error: "Failed to mint certificate" },
      { status: 500 }
    )
  }
}