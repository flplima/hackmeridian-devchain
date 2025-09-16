import { NextRequest, NextResponse } from "next/server"
import { serverDataStore } from "@/lib/server-data-store"
import { EscrowState } from "@/lib/server-data-store"
import { UserAddressService } from "@/lib/user-address-service"

// Release payment to freelancer (organization approval only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      escrowId,
      releaseTransactionHash,
      payerUserId // Organization user ID for verification
    } = body

    if (!escrowId || !releaseTransactionHash || !payerUserId) {
      return NextResponse.json(
        { error: "Missing required fields: escrowId, releaseTransactionHash, payerUserId" },
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

    if (escrow.state !== EscrowState.ACCEPTED) {
      return NextResponse.json(
        { error: "Escrow is not in accepted state" },
        { status: 400 }
      )
    }

    if (!escrow.payeeAddress) {
      return NextResponse.json(
        { error: "No payee address set" },
        { status: 400 }
      )
    }

    // Verify that the requester is the payer (organization)
    const payerStellarAddress = await UserAddressService.getStellarAddressByUserId(
      payerUserId,
      process.env.MASTER_TOKEN
    )

    if (payerStellarAddress !== escrow.payerAddress) {
      return NextResponse.json(
        { error: "Only the payer can release funds" },
        { status: 403 }
      )
    }

    // TODO: Verify the release transaction on Stellar blockchain
    // For now, we'll trust the provided transaction hash

    // Update escrow state
    escrow.state = EscrowState.COMPLETED
    escrow.releaseTransactionHash = releaseTransactionHash

    await serverDataStore.updateEscrow(escrow)

    // Update job status
    const job = await serverDataStore.getJobById(escrow.jobId)
    if (job) {
      job.status = "completed"
      await serverDataStore.updateJob(job)
    }

    return NextResponse.json({
      escrow,
      message: "Payment released successfully"
    })

  } catch (error) {
    console.error("Error releasing payment:", error)
    return NextResponse.json(
      { error: "Failed to release payment" },
      { status: 500 }
    )
  }
}