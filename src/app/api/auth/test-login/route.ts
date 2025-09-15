import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, org } = body

    if (username === "flplima") {
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
    }

    if (org === "stellar") {
      return NextResponse.json({
        success: true,
        redirectUrl: "/dashboard",
        user: {
          name: "Stellar",
          email: "contact@stellar.org",
          image: "https://stellar.org/wp-content/uploads/2023/06/stellar-logo.svg",
          description: "Blockchain Network for Smart Contracts, DeFi, Payments & Asset Tokenization",
          website: "https://stellar.org",
          provider: "linkedin"
        }
      })
    }

    return NextResponse.json({ error: "Invalid test credentials" }, { status: 400 })
  } catch (error) {
    console.error("Test login error:", error)
    return NextResponse.json(
      { error: "Test login failed" },
      { status: 500 }
    )
  }
}