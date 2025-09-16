import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function SignInPage() {
  const { user, login, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("stellar@stellar.org")
  const [emailLoading, setEmailLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // Check for GitHub auth user in cookies
    const authUserCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-user='))

    if (authUserCookie) {
      try {
        const userData = JSON.parse(decodeURIComponent(authUserCookie.split('=')[1]))
        login(userData)
        // Clear the cookie
        document.cookie = 'auth-user=; Max-Age=0; path=/'
        return
      } catch (error) {
        console.error('Failed to parse auth cookie:', error)
      }
    }

    if (!authLoading) {
      if (user) {
        router.push("/dashboard")
      } else {
        setLoading(false)
      }
    }
  }, [user, authLoading, router, login])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setEmailLoading(true)
    setError("")

    try {
      const response = await fetch('/api/auth/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success && data.user) {
        login(data.user)
        router.push("/dashboard")
      } else {
        setError(data.error || "Login failed")
      }
    } catch (error) {
      console.error("Email login error:", error)
      setError("Login failed. Please try again.")
    }
    setEmailLoading(false)
  }

  const handleGitHubLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'your-github-client-id'
    const redirectUri = `${window.location.origin}/api/auth/callback/github`
    const scope = 'user:email'

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`

    window.location.href = githubAuthUrl
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to ProofChain
          </h2>
          <p className="text-gray-600 mb-8">
            Build your verifiable on-chain developer portfolio
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGitHubLogin}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
            </svg>
            Sign in as Developer (GitHub)
          </button>

          <div className="border border-gray-300 rounded-md p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Email Login</h3>
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="stellar@stellar.org"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={emailLoading || !email}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {emailLoading ? "Signing in..." : "Sign in with Email"}
              </button>
            </form>
            <p className="mt-2 text-xs text-gray-500">
              Use &quot;stellar@stellar.org&quot; for organization demo, or any email for developer account
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
