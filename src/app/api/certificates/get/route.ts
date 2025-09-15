import { NextRequest, NextResponse } from "next/server"
import { CertificateService } from "@/lib/stellar"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const developerAddress = searchParams.get('address')

    if (!developerAddress) {
      return NextResponse.json(
        { error: "Developer address is required" },
        { status: 400 }
      )
    }

    // Get certificates from smart contract
    const certificates = await CertificateService.getCertificates(developerAddress)

    return NextResponse.json({
      certificates,
      count: certificates.length,
      developer: developerAddress
    })
  } catch (error) {
    console.error("Error getting certificates:", error)
    return NextResponse.json(
      { error: "Failed to get certificates" },
      { status: 500 }
    )
  }
}

// Verify a specific certificate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { developerAddress, issuerAddress, eventId } = body

    if (!developerAddress || !issuerAddress || !eventId) {
      return NextResponse.json(
        { error: "Missing required fields: developerAddress, issuerAddress, eventId" },
        { status: 400 }
      )
    }

    const isValid = await CertificateService.verifyCertificate(
      developerAddress,
      issuerAddress,
      eventId
    )

    return NextResponse.json({
      valid: isValid,
      message: isValid ? "Certificate is valid" : "Certificate not found or invalid"
    })
  } catch (error) {
    console.error("Error verifying certificate:", error)
    return NextResponse.json(
      { error: "Failed to verify certificate" },
      { status: 500 }
    )
  }
}