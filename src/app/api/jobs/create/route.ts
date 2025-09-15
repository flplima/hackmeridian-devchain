import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Simplified for now - remove auth check
    // const session = await auth()

    // if (!session || !session.user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    // if (session.provider !== "linkedin") {
    //   return NextResponse.json(
    //     { error: "Only organizations can create jobs" },
    //     { status: 403 }
    //   )
    // }

    const body = await request.json()
    const { title, description, amount, tags, requirements } = body

    if (!title || !description || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const jobData = {
      id: `job_${Date.now()}`,
      title,
      description,
      amount,
      tags: tags || [],
      requirements: requirements || [],
      employerName: "Test Employer",
      employerImage: "/default-org.png",
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