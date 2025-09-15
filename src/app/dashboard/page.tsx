"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface GitHubProfile {
  name: string
  login: string
  avatar_url: string
  public_repos: number
  followers: number
  following: number
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [githubProfile, setGithubProfile] = useState<GitHubProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [testSession, setTestSession] = useState<any>(null)

  useEffect(() => {
    const testSessionData = localStorage.getItem("test-session")
    if (testSessionData) {
      const parsedTestSession = JSON.parse(testSessionData)
      setTestSession(parsedTestSession)
      if (parsedTestSession.provider === "github") {
        setGithubProfile({
          name: parsedTestSession.name,
          login: "flplima",
          avatar_url: parsedTestSession.image,
          public_repos: 42,
          followers: 123,
          following: 56,
        })
      }
      setLoading(false)
      return
    }

    if (status === "loading") return

    if (!session) {
      router.push("/auth/signin")
      return
    }

    if (session.provider === "github") {
      fetchGitHubProfile()
    } else {
      setLoading(false)
    }
  }, [session, status, router])

  const fetchGitHubProfile = async () => {
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${session?.accessToken}`,
        },
      })
      const profile = await response.json()
      setGithubProfile(profile)
    } catch (error) {
      console.error("Error fetching GitHub profile:", error)
    }
    setLoading(false)
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  const currentSession = testSession || session
  if (!currentSession) {
    return null
  }

  const isDeveloper = currentSession.provider === "github"
  const isOrganization = currentSession.provider === "linkedin"

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              DevChain Dashboard
            </h1>
            <button
              onClick={() => {
                localStorage.removeItem("test-session")
                signOut()
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {isDeveloper && (
            <div className="space-y-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Developer Profile
                  </h3>
                  {githubProfile && (
                    <div className="flex items-center space-x-4">
                      <img
                        src={githubProfile.avatar_url}
                        alt="Avatar"
                        className="h-16 w-16 rounded-full"
                      />
                      <div>
                        <h4 className="text-xl font-semibold">{githubProfile.name}</h4>
                        <p className="text-gray-600">@{githubProfile.login}</p>
                        <div className="flex space-x-4 mt-2 text-sm text-gray-500">
                          <span>{githubProfile.public_repos} repos</span>
                          <span>{githubProfile.followers} followers</span>
                          <span>{githubProfile.following} following</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Your Certificates
                  </h3>
                  <p className="text-gray-500">No certificates yet. Complete courses or jobs to earn certificates!</p>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Available Jobs
                  </h3>
                  <p className="text-gray-500">No jobs available at the moment.</p>
                </div>
              </div>
            </div>
          )}

          {isOrganization && (
            <div className="space-y-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Organization Profile
                  </h3>
                  <div className="flex items-center space-x-4">
                    <img
                      src={currentSession.user?.image || currentSession.image || "/default-org.png"}
                      alt="Organization Logo"
                      className="h-16 w-16 rounded-full"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/64/0066CC/FFFFFF?text=S"
                      }}
                    />
                    <div>
                      <h4 className="text-xl font-semibold">{currentSession.user?.name || currentSession.name}</h4>
                      <p className="text-gray-600">Organization</p>
                      {(currentSession.user?.description || currentSession.description) && (
                        <p className="text-sm text-gray-500 mt-1">
                          {currentSession.user?.description || currentSession.description}
                        </p>
                      )}
                      {(currentSession.user?.website || currentSession.website) && (
                        <a
                          href={currentSession.user?.website || currentSession.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {currentSession.user?.website || currentSession.website}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Create Opportunities
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => router.push("/jobs/create")}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400"
                    >
                      <h4 className="font-medium">Post a Job</h4>
                      <p className="text-sm text-gray-500">Create freelance opportunities</p>
                    </button>
                    <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400">
                      <h4 className="font-medium">Create Course</h4>
                      <p className="text-sm text-gray-500">Offer learning opportunities</p>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Your Posted Jobs
                  </h3>
                  <p className="text-gray-500">No jobs posted yet.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}