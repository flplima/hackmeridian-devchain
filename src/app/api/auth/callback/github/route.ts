import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.redirect(new URL('/auth/signin?error=missing_code', request.url))
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('GitHub OAuth error:', tokenData)
      return NextResponse.redirect(new URL('/auth/signin?error=oauth_failed', request.url))
    }

    // Get user information from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    const githubUser = await userResponse.json()

    if (!githubUser.id) {
      return NextResponse.redirect(new URL('/auth/signin?error=invalid_user', request.url))
    }

    // Create user object
    const user = {
      id: githubUser.id.toString(),
      name: githubUser.name || githubUser.login,
      email: githubUser.email,
      image: githubUser.avatar_url,
      githubHandle: githubUser.login,
      githubId: githubUser.id,
      provider: 'github',
      userType: 'developer'
    }

    // Create a response that redirects to dashboard with user data
    const response = NextResponse.redirect(new URL('/dashboard', request.url))

    // Set user data in a cookie that will be read by the client
    response.cookies.set('auth-user', JSON.stringify(user), {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.redirect(new URL('/auth/signin?error=server_error', request.url))
  }
}