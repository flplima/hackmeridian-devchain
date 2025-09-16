import { NextRequest, NextResponse } from "next/server"
import { serverDataStore } from "@/lib/server-data-store"
import { EscrowState } from "@/lib/server-data-store"
import { UserAddressService } from "@/lib/user-address-service"

// Freelancer accepts the job and sets their address as payee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      escrowId,
      freelancerUserId
    } = body

    if (!escrowId || !freelancerUserId) {
      return NextResponse.json(
        { error: "Missing required fields: escrowId, freelancerUserId" },
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

    if (escrow.state !== EscrowState.FUNDED) {
      return NextResponse.json(
        { error: "Escrow is not funded yet" },
        { status: 400 }
      )
    }

    // Get or create freelancer's Stellar address using the service
    const freelancerStellarAddress = await UserAddressService.getStellarAddressByUserId(
      freelancerUserId,
      process.env.MASTER_TOKEN
    )

    if (!freelancerStellarAddress) {
      return NextResponse.json(
        { error: "Failed to create Stellar address for freelancer" },
        { status: 500 }
      )
    }

    // Update escrow with payee address
    escrow.payeeAddress = freelancerStellarAddress
    escrow.state = EscrowState.ACCEPTED

    await serverDataStore.updateEscrow(escrow)

    // Update the job with freelancer ID
    const job = await serverDataStore.getJobById(escrow.jobId)
    if (job) {
      job.freelancerId = freelancerUserId
      job.status = "in-progress"
      await serverDataStore.updateJob(job)
    }

    return NextResponse.json({
      escrow,
      message: "Job accepted successfully"
    })

  } catch (error) {
    console.error("Error accepting job:", error)
    return NextResponse.json(
      { error: "Failed to accept job" },
      { status: 500 }
    )
  }
}