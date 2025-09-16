import { NextRequest, NextResponse } from "next/server"
import { serverDataStore } from "@/lib/server-data-store"
import { EscrowState } from "@/lib/server-data-store"

// Organization marks job as completed and releases payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      jobId,
      freelancerAddress,
      badgeTitle,
      badgeDescription,
      imageUrl,
      organizationId,
      masterToken,
      // Legacy support
      releaseTransactionHash,
      completedByUserId
    } = body

    console.log("Job completion request:", { jobId, freelancerAddress, organizationId })

    if (!jobId || (!organizationId && !completedByUserId)) {
      return NextResponse.json(
        { error: "Missing required fields: jobId, organizationId" },
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

    // Check if the job can be completed (support both accepted and in-progress statuses)
    if (job.status !== "accepted" && job.status !== "in-progress") {
      return NextResponse.json(
        { error: `Job is not in accepted/in-progress status (current: ${job.status})` },
        { status: 400 }
      )
    }

    // Verify the organization owns this job
    const authUserId = organizationId || completedByUserId
    if (job.employerId !== authUserId) {
      return NextResponse.json(
        { error: "Unauthorized: You can only complete your own jobs" },
        { status: 403 }
      )
    }

    if (!job.freelancerId) {
      return NextResponse.json(
        { error: "Job has no assigned freelancer" },
        { status: 400 }
      )
    }

    // Handle escrow if present
    let escrow = null
    if (job.escrowId) {
      escrow = await serverDataStore.getEscrowById(job.escrowId)
      if (!escrow) {
        return NextResponse.json(
          { error: "Associated escrow not found" },
          { status: 400 }
        )
      }

      // Support both pending and accepted states for escrow completion
      if (escrow.state !== EscrowState.ACCEPTED && escrow.state !== EscrowState.PENDING) {
        return NextResponse.json(
          { error: `Escrow is not in accepted/pending state (current: ${escrow.state})` },
          { status: 400 }
        )
      }

      // Generate mock transaction hash if not provided
      const transactionHash = releaseTransactionHash || `mock_release_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Update escrow state (direct release for hackathon demo)
      escrow.state = EscrowState.COMPLETED
      escrow.releaseTransactionHash = transactionHash
      escrow.payeeAddress = freelancerAddress || escrow.payeeAddress
      escrow.completedAt = new Date().toISOString()
      await serverDataStore.updateEscrow(escrow)
    }

    // Update job status
    job.status = "completed"
    job.completedAt = new Date().toISOString()
    await serverDataStore.updateJob(job)

    // Mock badge transaction hash for demo
    const badgeTransactionHash = `badge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    console.log(`✅ Job ${jobId} completed successfully`)
    if (escrow) {
      console.log(`💰 Mock payment of ${job.amount} XLM released to ${freelancerAddress || escrow.payeeAddress}`)
      console.log(`📄 Escrow ${escrow.id} marked as completed`)
    }
    if (badgeTitle) {
      console.log(`🏆 Mock badge "${badgeTitle}" emitted with transaction: ${badgeTransactionHash}`)
    }

    return NextResponse.json({
      success: true,
      job,
      escrow,
      transactionHash: badgeTransactionHash,
      message: "Job completed successfully",
      payment: escrow ? {
        amount: job.amount,
        usdAmount: job.usdAmount,
        currency: 'XLM',
        recipientAddress: freelancerAddress || escrow.payeeAddress,
        releaseTransactionHash: escrow.releaseTransactionHash
      } : null
    })

  } catch (error) {
    console.error("Error completing job:", error)
    return NextResponse.json(
      { error: "Failed to complete job" },
      { status: 500 }
    )
  }
}