"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Event {
  id: string
  title: string
  tags: string[]
}

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
  const [testSession, setTestSession] = useState<{
    provider: string
    name: string
    email: string
    image: string
    user?: {
      name: string
      email: string
      image: string
    }
  } | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [availableEvents, setAvailableEvents] = useState<Event[]>([])

  useEffect(() => {
    let testSessionData = null
    let parsedTestSession = null

    if (typeof window !== 'undefined') {
      testSessionData = localStorage.getItem("test-session")
      if (testSessionData) {
        parsedTestSession = JSON.parse(testSessionData)
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
      }
    }

    if (status === "loading" && !testSessionData) return

    if (!session && !testSessionData) {
      router.push("/auth/signin")
      return
    }

    // Temporarily disabled - provider check needs custom session type
    // if ((session?.provider === "github") || (testSessionData && parsedTestSession?.provider === "github")) {
    //   if (!testSessionData) {
    //     fetchGitHubProfile()
    //   }
    // } else {
      setLoading(false)
    // }

    loadEvents()
  }, [session, status, router]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/events")
      if (response.ok) {
        const data = await response.json()
        setAvailableEvents(data.events)
        setEvents(data.events)
      } else {
        console.error("Failed to fetch events")
      }
    } catch (error) {
      console.error("Error fetching events:", error)
    }
  }

  // Temporarily disabled - requires custom session type with accessToken
  // const fetchGitHubProfile = async () => {
  //   try {
  //     const response = await fetch("https://api.github.com/user", {
  //       headers: {
  //         Authorization: `token ${session?.accessToken}`,
  //       },
  //     })
  //     const profile = await response.json()
  //     setGithubProfile(profile)
  //   } catch (error) {
  //     console.error("Error fetching GitHub profile:", error)
  //   }
  //   setLoading(false)
  // }

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

  // Temporarily hardcode user type since auth is disabled
  const isDeveloper = testSession ? testSession.provider === "github" : true
  const isOrganization = testSession ? testSession.provider === "linkedin" : false

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
                if (typeof window !== 'undefined') {
                  localStorage.removeItem("test-session")
                }
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

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Available Events
                  </h3>
                  {availableEvents.length > 0 ? (
                    <div className="space-y-4">
                      {availableEvents.map((event) => (
                        <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{event.title}</h4>
                              {event.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {event.tags.map((tag: string, index: number) => (
                                    <span
                                      key={index}
                                      className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No events available at the moment.</p>
                  )}
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
                      src={currentSession.user?.image || (testSession?.image) || "/default-org.png"}
                      alt="Organization Logo"
                      className="h-16 w-16 rounded-full"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/64/0066CC/FFFFFF?text=S"
                      }}
                    />
                    <div>
                      <h4 className="text-xl font-semibold">{currentSession.user?.name || testSession?.name || "Organization"}</h4>
                      <p className="text-gray-600">Organization</p>
                      {isOrganization && (
                        <p className="text-sm text-gray-500 mt-1">
                          Leading blockchain infrastructure company
                        </p>
                      )}
                      {isOrganization && (
                        <a
                          href="https://stellar.org"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          https://stellar.org
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
                    <button
                      onClick={() => router.push("/events/create")}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400"
                    >
                      <h4 className="font-medium">Create Event</h4>
                      <p className="text-sm text-gray-500">Organize hackathons, courses & events</p>
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

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Your Events
                  </h3>
                  {events.length > 0 ? (
                    <div className="space-y-4">
                      {events.map((event) => (
                        <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{event.title}</h4>
                              {event.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {event.tags.map((tag: string, index: number) => (
                                    <span
                                      key={index}
                                      className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <button
                                onClick={() => router.push(`/events/${event.id}/manage`)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                              >
                                Manage Event
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No events created yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}