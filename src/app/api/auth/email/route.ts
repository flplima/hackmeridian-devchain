import { NextRequest, NextResponse } from 'next/server'
import { serverDataStore } from '@/lib/server-data-store'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if it's the Stellar organization
    if (email === 'stellar@stellar.org') {
      const stellarOrg = await serverDataStore.getOrganizationById("550e8400-e29b-41d4-a716-446655442000")

      if (stellarOrg) {
        const user = {
          id: stellarOrg.id,
          name: stellarOrg.name,
          email: email,
          image: "https://stellar.org/wp-content/uploads/2023/06/stellar-logo.svg",
          description: stellarOrg.description,
          provider: 'email',
          userType: 'organization'
        }

        return NextResponse.json({ user, success: true })
      }
    }

    // For demo purposes, allow any email as a developer
    const user = {
      id: `email-${Date.now()}`, // Generate a simple ID
      name: email.split('@')[0], // Use part before @ as name
      email: email,
      provider: 'email',
      userType: 'developer'
    }

    return NextResponse.json({ user, success: true })
  } catch (error) {
    console.error('Email auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}