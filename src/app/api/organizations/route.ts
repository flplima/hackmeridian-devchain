import { NextRequest, NextResponse } from "next/server"
import { serverDataStore } from "@/lib/server-data-store"
import { UserAddressService } from "@/lib/user-address-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    // Search organizations by query
    const organizations = await serverDataStore.searchOrganizations(query)

    // Limit results and enrich with Stellar addresses
    const enrichedOrganizations = await Promise.all(
      organizations.slice(0, limit).map(async (org) => {
        // Get or create Stellar address for this organization using UUID
        const stellarAddress = UserAddressService.getOrganizationAddress(org.id)

        return {
          id: org.id,
          name: org.name,
          description: org.description,
          createdAt: org.createdAt,
          stellarAddress,
          // Add display text for search highlighting
          searchText: `${org.name} ${org.description || ''}`.toLowerCase()
        }
      })
    )

    return NextResponse.json({
      organizations: enrichedOrganizations,
      query,
      total: organizations.length,
      returned: enrichedOrganizations.length
    })
  } catch (error) {
    console.error("Error searching organizations:", error)
    return NextResponse.json(
      { error: "Failed to search organizations" },
      { status: 500 }
    )
  }
}

// POST endpoint to add/update organization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      )
    }

    // Create organization object with UUID
    const { v4: uuidv4 } = await import('uuid')
    const organization = {
      id: uuidv4(),
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
    }

    // Add/update organization in store
    await serverDataStore.addOrganization(organization)

    // Ensure the organization has a Stellar address using UUID
    const stellarAddress = UserAddressService.getOrganizationAddress(organization.id)

    return NextResponse.json({
      organization: {
        ...organization,
        stellarAddress
      },
      message: "Organization added/updated successfully"
    })
  } catch (error) {
    console.error("Error adding organization:", error)
    return NextResponse.json(
      { error: "Failed to add organization" },
      { status: 500 }
    )
  }
}