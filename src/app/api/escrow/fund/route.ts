import { NextRequest, NextResponse } from "next/server"
import { serverDataStore } from "@/lib/server-data-store"
import { EscrowState } from "@/lib/server-data-store"

// Fund escrow with Stellar transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      escrowId,
      transactionHash,
      escrowAccountId
    } = body

    if (!escrowId || !transactionHash) {
      return NextResponse.json(
        { error: "Missing required fields: escrowId, transactionHash" },
        { status: 400 }
      )
    }

    const escrow = await serverDataStore.getEscrowById(escrowId)
    if (!escrow) {
      return NextResponse.json(
        { error: "Escrow not found" },
        { status: 404 }
      )
    }

    if (escrow.state !== EscrowState.PENDING) {
      return NextResponse.json(
        { error: "Escrow is not in pending state" },
        { status: 400 }
      )
    }

    // TODO: Verify the transaction on Stellar blockchain
    // For now, we'll trust the provided transaction hash

    // Update escrow state
    escrow.state = EscrowState.FUNDED
    escrow.transactionHash = transactionHash
    escrow.escrowAccountId = escrowAccountId

    await serverDataStore.updateEscrow(escrow)

    return NextResponse.json({
      escrow,
      message: "Escrow funded successfully"
    })

  } catch (error) {
    console.error("Error funding escrow:", error)
    return NextResponse.json(
      { error: "Failed to fund escrow" },
      { status: 500 }
    )
  }
}