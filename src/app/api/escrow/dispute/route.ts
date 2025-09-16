import { NextRequest, NextResponse } from "next/server"
import { serverDataStore } from "@/lib/server-data-store"
import { EscrowState } from "@/lib/server-data-store"
import { UserAddressService } from "@/lib/user-address-service"

// Cancel/refund escrow (for hackathon simplicity)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      escrowId,
      action, // 'cancel' only for hackathon
      payerUserId, // Organization user ID for verification
      refundTransactionHash
    } = body

    if (!escrowId || !action || !payerUserId) {
      return NextResponse.json(
        { error: "Missing required fields: escrowId, action, payerUserId" },
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

    if (action === 'cancel') {
      // Allow cancellation only if job not accepted yet, or if payer wants to refund
      if (escrow.state !== EscrowState.FUNDED && escrow.state !== EscrowState.ACCEPTED) {
        return NextResponse.json(
          { error: "Can only cancel funded or accepted escrows" },
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
          { error: "Only the payer can cancel escrow" },
          { status: 403 }
        )
      }

      if (!refundTransactionHash) {
        return NextResponse.json(
          { error: "Missing refundTransactionHash" },
          { status: 400 }
        )
      }

      escrow.state = EscrowState.CANCELLED
      escrow.releaseTransactionHash = refundTransactionHash
      await serverDataStore.updateEscrow(escrow)

      // Update job status
      const job = await serverDataStore.getJobById(escrow.jobId)
      if (job) {
        job.status = "cancelled"
        await serverDataStore.updateJob(job)
      }

      return NextResponse.json({
        escrow,
        message: "Escrow cancelled and refunded successfully"
      })
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'cancel' for hackathon demo." },
      { status: 400 }
    )

  } catch (error) {
    console.error("Error handling escrow cancellation:", error)
    return NextResponse.json(
      { error: "Failed to handle escrow cancellation" },
      { status: 500 }
    )
  }
}