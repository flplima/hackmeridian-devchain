import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { EscrowService } from "@/lib/stellar"
import { Keypair } from "@stellar/stellar-sdk"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.provider !== "linkedin") {
      return NextResponse.json(
        { error: "Only organizations can create jobs" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, amount, tags, requirements } = body

    if (!title || !description || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const jobId = `job_${Date.now()}`
    const employerKeypair = Keypair.random()

    const jobData = {
      id: jobId,
      title,
      description,
      amount,
      tags: tags || [],
      requirements: requirements || [],
      employerName: session.user.name,
      employerImage: session.user.image,
      createdAt: new Date().toISOString(),
      status: "open",
    }

    return NextResponse.json({
      job: jobData,
      message: "Job created successfully"
    })
  } catch (error) {
    console.error("Error creating job:", error)
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    )
  }
}