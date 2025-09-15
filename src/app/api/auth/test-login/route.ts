import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username } = body

    if (username !== "flplima") {
      return NextResponse.json({ error: "Invalid test user" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      redirectUrl: "/dashboard",
      user: {
        name: "Felipe Lima",
        email: "flplima@example.com",
        image: "https://github.com/flplima.png",
        provider: "github"
      }
    })
  } catch (error) {
    console.error("Test login error:", error)
    return NextResponse.json(
      { error: "Test login failed" },
      { status: 500 }
    )
  }
}