import { NextRequest, NextResponse } from "next/server"
import { UserAddressService } from "@/lib/user-address-service"

interface GitHubUser {
  id: number
  login: string
  avatar_url: string
  html_url: string
  type: string
}

interface GitHubSearchResponse {
  total_count: number
  incomplete_results: boolean
  items: GitHubUser[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      )
    }

    // Search GitHub users using their public API
    const response = await fetch(
      `https://api.github.com/search/users?q=${encodeURIComponent(query)}&per_page=10`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'DevChain-App/1.0'
        }
      }
    )

    if (!response.ok) {
      console.error('GitHub API error:', response.status, response.statusText)
      return NextResponse.json(
        { error: "Failed to search GitHub users" },
        { status: response.status }
      )
    }

    const data: GitHubSearchResponse = await response.json()

    // Transform GitHub users to our format and add Stellar addresses
    const users = await Promise.all(
      data.items.map(async (githubUser) => {
        // Fetch full user details to get display name
        let displayName = githubUser.login // Default to username
        try {
          const userResponse = await fetch(`https://api.github.com/users/${githubUser.login}`, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'DevChain-App/1.0'
            }
          })
          if (userResponse.ok) {
            const userData = await userResponse.json()
            displayName = userData.name || githubUser.login // Use display name if available
          }
        } catch (error) {
          console.error(`Error fetching user details for ${githubUser.login}:`, error)
        }

        // Generate Stellar address for each GitHub user
        let stellarAddress = null
        try {
          stellarAddress = await UserAddressService.getStellarAddressByGithubId(
            githubUser.id,
            process.env.MASTER_TOKEN || "demo-master-token-123"
          )
        } catch (error) {
          console.error(`Error generating stellar address for GitHub user ${githubUser.id}:`, error)
        }

        return {
          id: githubUser.id.toString(),
          name: displayName, // Use actual display name from GitHub
          email: `${githubUser.login}@github.local`, // Placeholder email
          githubHandle: githubUser.login,
          githubId: githubUser.id,
          profileImage: githubUser.avatar_url,
          stellarAddress
        }
      })
    )

    return NextResponse.json({
      users,
      total_count: data.total_count,
      incomplete_results: data.incomplete_results
    })
  } catch (error) {
    console.error("Error searching GitHub users:", error)
    return NextResponse.json(
      { error: "Failed to search GitHub users" },
      { status: 500 }
    )
  }
}