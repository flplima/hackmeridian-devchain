"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import EmitBadgeModal from "@/components/EmitBadgeModal"

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
  const { user, logout, loading: authLoading } = useAuth()
  const router = useRouter()
  const [githubProfile, setGithubProfile] = useState<GitHubProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [availableEvents, setAvailableEvents] = useState<Event[]>([])
  const [stellarAddress, setStellarAddress] = useState<string | null>(null)
  const [stellarAddressLoading, setStellarAddressLoading] = useState(false)
  const [emitBadgeModalOpen, setEmitBadgeModalOpen] = useState(false)
  const [selectedEventForBadge, setSelectedEventForBadge] = useState<Event | null>(null)
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({})

  // Determine user type from auth context
  const isDeveloper = user?.userType === "developer"
  const isOrganization = user?.userType === "organization"

  useEffect(() => {
    console.log("Dashboard useEffect - authLoading:", authLoading, "user:", !!user)

    if (authLoading) {
      console.log("Auth still loading, waiting...")
      return
    }

    if (!user) {
      console.log("No user found, redirecting to signin")
      // Add a small delay to prevent immediate redirect loops
      setTimeout(() => {
        router.push("/auth/signin")
      }, 100)
      return
    }

    console.log("User found, loading dashboard for user:", user)
    setLoading(false)
    loadEvents()

    if (isOrganization) {
      loadBadgeCounts()
    }
  }, [user, authLoading, router, isOrganization]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const loadBadgeCounts = async () => {
    try {
      if (!user || !isOrganization) {
        console.log("User is not an organization, skipping badge count loading")
        return
      }

      // Use the user's ID (which should be the UUID) as the organization identifier
      const organizationId = user.id || "unknown-org"

      console.log(`Loading badge counts for organization: ${organizationId}`)

      const response = await fetch(`/api/blockchain/badges?organizationId=${encodeURIComponent(organizationId)}`)
      if (response.ok) {
        const data = await response.json()
        console.log(`Loaded badge counts:`, data.badgeCounts)
        setBadgeCounts(data.badgeCounts || {})
      } else {
        console.error("Failed to fetch badge counts:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("Error fetching badge counts:", error)
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

  // Simplified stellar address for demo - not needed for organization users
  useEffect(() => {
    if (isDeveloper) {
      setStellarAddress("DEMO_STELLAR_ADDRESS_FOR_DEVELOPER")
    }
  }, [isDeveloper])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              DevChain Dashboard
            </h1>
            <button
              onClick={() => logout()}
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

                  {/* Stellar Address Section */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Stellar Address</h4>
                    {stellarAddressLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-500">Loading Stellar address...</span>
                      </div>
                    ) : stellarAddress ? (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700 mb-1">Your Public Address</p>
                            <code className="text-xs bg-white px-2 py-1 rounded border font-mono break-all">
                              {stellarAddress}
                            </code>
                          </div>
                          <button
                            onClick={() => navigator.clipboard.writeText(stellarAddress)}
                            className="ml-3 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          🏆 This address will receive your achievement badges on the Stellar blockchain
                        </p>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Failed to load Stellar address. Please refresh the page.
                      </div>
                    )}
                  </div>
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
                    {user.image ? (
                      <img
                        src={user.image}
                        alt="Organization Logo"
                        className="h-16 w-16 rounded-full"
                        onError={(e) => {
                          // Hide the image and show fallback div instead
                          e.currentTarget.style.display = 'none'
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.style.display = 'flex'
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center"
                      style={{ display: user.image ? 'none' : 'flex' }}
                    >
                      <span className="text-white font-bold text-xl">
                        {(user.name || "Organization").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold">{user.name || "Organization"}</h4>
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
                              <div className="flex items-center gap-3">
                                <h4 className="font-semibold text-lg">{event.title}</h4>
                                {isOrganization && (
                                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-medium">
                                    {badgeCounts[event.id] || 0} badges
                                  </span>
                                )}
                              </div>
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
                                onClick={() => {
                                  setSelectedEventForBadge(event)
                                  setEmitBadgeModalOpen(true)
                                }}
                                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
                              >
                                🏆 Emit Badges
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

      {/* Emit Badge Modal */}
      {selectedEventForBadge && (
        <EmitBadgeModal
          isOpen={emitBadgeModalOpen}
          onClose={() => {
            setEmitBadgeModalOpen(false)
            setSelectedEventForBadge(null)
          }}
          event={selectedEventForBadge}
        />
      )}
    </div>
  )
}