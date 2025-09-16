import { NextRequest, NextResponse } from "next/server"
import { serverDataStore } from "@/lib/server-data-store"
import { EscrowState } from "@/lib/server-data-store"
import { UserAddressService } from "@/lib/user-address-service"

// Freelancer accepts a job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      jobId,
      freelancerUserId
    } = body

    if (!jobId || !freelancerUserId) {
      return NextResponse.json(
        { error: "Missing required fields: jobId, freelancerUserId" },
        { status: 400 }
      )
    }

    // Get the job
    const job = await serverDataStore.getJobById(jobId)
    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      )
    }

    if (job.status !== "open") {
      return NextResponse.json(
        { error: "Job is not available for acceptance" },
        { status: 400 }
      )
    }

    if (job.freelancerId) {
      return NextResponse.json(
        { error: "Job has already been accepted by another freelancer" },
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
        { error: "Failed to create Stellar address for freelancer. Please try again." },
        { status: 500 }
      )
    }

    // Check if there's an associated escrow
    let escrow = null
    if (job.escrowId) {
      escrow = await serverDataStore.getEscrowById(job.escrowId)
      if (!escrow) {
        return NextResponse.json(
          { error: "Associated escrow not found" },
          { status: 400 }
        )
      }

      if (escrow.state !== EscrowState.FUNDED) {
        return NextResponse.json(
          { error: "Escrow must be funded before job can be accepted" },
          { status: 400 }
        )
      }

      // Update escrow with freelancer's address
      escrow.payeeAddress = freelancerStellarAddress
      escrow.state = EscrowState.ACCEPTED
      await serverDataStore.updateEscrow(escrow)
    }

    // Update job
    job.freelancerId = freelancerUserId
    job.status = "accepted" // Change to accepted so employer can complete it
    job.acceptedAt = new Date().toISOString()
    await serverDataStore.updateJob(job)

    return NextResponse.json({
      job,
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