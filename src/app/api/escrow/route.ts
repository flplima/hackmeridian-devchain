import { NextRequest, NextResponse } from "next/server"
import { serverDataStore } from "@/lib/server-data-store"
import { Escrow, EscrowState } from "@/lib/server-data-store"
import { UserAddressService } from "@/lib/user-address-service"
import { v4 as uuidv4 } from "uuid"

// Create new escrow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      jobId,
      payerUserId,
      amount,
      deadline,
      tokenAddress = "XLM" // Default to XLM
    } = body

    if (!jobId || !payerUserId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: jobId, payerUserId, amount" },
        { status: 400 }
      )
    }

    // Get job to verify it exists
    const job = await serverDataStore.getJobById(jobId)
    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      )
    }

    // Get payer's Stellar address
    const payerUserAddress = await serverDataStore.getUserAddress(payerUserId)
    if (!payerUserAddress) {
      return NextResponse.json(
        { error: "Payer Stellar address not found" },
        { status: 400 }
      )
    }

    // Convert amount to stroops (1 XLM = 10,000,000 stroops)
    const stellarAmount = Math.round(parseFloat(amount) * 10000000).toString()

    const escrow: Escrow = {
      id: uuidv4(),
      jobId,
      payerAddress: payerUserAddress.stellarAddress,
      tokenAddress,
      amount: stellarAmount,
      state: EscrowState.PENDING,
      createdAt: new Date().toISOString(),
      deadline: deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days default
    }

    await serverDataStore.addEscrow(escrow)

    // Update job with escrow ID
    job.escrowId = escrow.id
    job.stellarAmount = stellarAmount
    await serverDataStore.updateJob(job)

    return NextResponse.json({
      escrow,
      message: "Escrow created successfully"
    })

  } catch (error) {
    console.error("Error creating escrow:", error)
    return NextResponse.json(
      { error: "Failed to create escrow" },
      { status: 500 }
    )
  }
}

// Get escrows
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const escrowId = searchParams.get('escrowId')
    const payerAddress = searchParams.get('payerAddress')
    const payeeAddress = searchParams.get('payeeAddress')

    if (escrowId) {
      const escrow = await serverDataStore.getEscrowById(escrowId)
      if (!escrow) {
        return NextResponse.json(
          { error: "Escrow not found" },
          { status: 404 }
        )
      }
      return NextResponse.json({ escrow })
    }

    if (jobId) {
      const escrow = await serverDataStore.getEscrowByJobId(jobId)
      if (!escrow) {
        return NextResponse.json(
          { error: "Escrow not found for job" },
          { status: 404 }
        )
      }
      return NextResponse.json({ escrow })
    }

    if (payerAddress) {
      const escrows = await serverDataStore.getEscrowsByPayer(payerAddress)
      return NextResponse.json({ escrows })
    }

    if (payeeAddress) {
      const escrows = await serverDataStore.getEscrowsByPayee(payeeAddress)
      return NextResponse.json({ escrows })
    }

    // Return all escrows if no specific filter
    const escrows = await serverDataStore.getEscrows()
    return NextResponse.json({ escrows })

  } catch (error) {
    console.error("Error fetching escrows:", error)
    return NextResponse.json(
      { error: "Failed to fetch escrows" },
      { status: 500 }
    )
  }
}