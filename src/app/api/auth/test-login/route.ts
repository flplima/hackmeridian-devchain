import { NextRequest, NextResponse } from "next/server"
import { serverDataStore } from "@/lib/server-data-store"

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
      const stellarOrg = await serverDataStore.getOrganizationById("550e8400-e29b-41d4-a716-446655442000")

      if (stellarOrg) {
        return NextResponse.json({
          success: true,
          redirectUrl: "/dashboard",
          user: {
            id: stellarOrg.id,
            name: stellarOrg.name,
            email: "contact@stellar.org",
            image: "https://stellar.org/wp-content/uploads/2023/06/stellar-logo.svg",
            description: stellarOrg.description || "Building the open financial system",
            website: "https://stellar.org",
            provider: "linkedin"
          }
        })
      }
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