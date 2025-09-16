"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Image from "next/image"
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
  const [githubProfile] = useState<GitHubProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [availableEvents, setAvailableEvents] = useState<Event[]>([])
  const [stellarAddress, setStellarAddress] = useState<string | null>(null)
  const [stellarAddressLoading] = useState(false)
  const [emitBadgeModalOpen, setEmitBadgeModalOpen] = useState(false)
  const [selectedEventForBadge, setSelectedEventForBadge] = useState<Event | null>(null)
  const [orgStellarAddress, setOrgStellarAddress] = useState<string | null>(null)

  const isDeveloper = user?.userType === "developer"
  const isOrganization = user?.userType === "organization"

  // Helper function to get organization name from address
  const getOrganizationName = (issuerAddress: string): string => {
    // Map known issuer addresses to organization names
    const knownOrganizations: Record<string, string> = {
      'GCR23HMPNGVYEKTVVGQDTVECMBER6DI7NJBD3EQITKRHEHH7GNHUXSIF': 'HackMeridian',
      // Add more organizations as needed
    }

    return knownOrganizations[issuerAddress] || `Organization (${issuerAddress.substring(0, 8)}...)`
  }

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/auth/signin")
      return
    }

    console.log("User found, loading dashboard for user:", user)
    setLoading(false)
    loadEvents()

    // Fetch organization stellar address if organization user
    if (isOrganization && user.id) {
      fetchOrgStellarAddress()
    }
  }, [user, authLoading, router, isOrganization]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/events")
      if (response.ok) {
        const data = await response.json()
        console.log("Events loaded:", data.events?.length || 0)
        setEvents(data.events || [])
        setAvailableEvents(data.events || [])
      }
    } catch (error) {
      console.error("Error loading events:", error)
    }
  }

  const fetchOrgStellarAddress = async () => {
    try {
      // Use the actual organization address that issues badges
      const actualAddress = 'GCR23HMPNGVYEKTVVGQDTVECMBER6DI7NJBD3EQITKRHEHH7GNHUXSIF'
      setOrgStellarAddress(actualAddress)
      console.log('🔍 DEBUG: Using actual organization address:', actualAddress)
    } catch (error) {
      console.error("Error setting org stellar address:", error)
    }
  }

  // React Query to fetch badge counts for organization
  const { data: badgeData } = useQuery({
    queryKey: ['badges', user?.id],
    queryFn: async () => {
      if (!user?.id || !isOrganization) {
        throw new Error('Organization ID required')
      }

      // Use the actual issuer address that badges were emitted from
      const actualOrgAddress = 'GCR23HMPNGVYEKTVVGQDTVECMBER6DI7NJBD3EQITKRHEHH7GNHUXSIF'
      console.log('🔍 DEBUG: Dashboard fetching badges for organization address:', actualOrgAddress)
      const response = await fetch(`/api/blockchain/badges?organizationId=${encodeURIComponent(actualOrgAddress)}`)
      console.log('🔍 DEBUG: Badge API response status:', response.status)
      if (!response.ok) {
        throw new Error(`Failed to fetch badges: ${response.status}`)
      }
      const data = await response.json()
      console.log('🔍 DEBUG: Badge data received:', data)
      return data
    },
    enabled: !!user?.id && isOrganization,
    staleTime: 10 * 1000, // 10 seconds for debugging
    refetchInterval: 10 * 1000, // Refetch every 10 seconds for debugging
  })

  const badgeCounts = badgeData?.badgeCounts || {}

  // React Query to fetch badges for developer
  const { data: developerBadges, isLoading: badgesLoading } = useQuery({
    queryKey: ['developer-badges', stellarAddress],
    queryFn: async () => {
      if (!stellarAddress || stellarAddress === "GA3MC2DLXO7AHIITD637JKQCPD466DGWMFQPTJPJYAIE7XC3NRQCSR76") {
        throw new Error('Valid Stellar address required')
      }
      console.log('🔍 Fetching badges for developer address:', stellarAddress)
      const response = await fetch(`/api/blockchain/badges?recipientAddress=${encodeURIComponent(stellarAddress)}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch developer badges: ${response.status}`)
      }
      const data = await response.json()
      console.log('🏆 Developer badges received:', data)
      return data
    },
    enabled: !!stellarAddress && isDeveloper && stellarAddress !== "GA3MC2DLXO7AHIITD637JKQCPD466DGWMFQPTJPJYAIE7XC3NRQCSR76",
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  })

  // Fetch developer's real Stellar address
  useEffect(() => {
    if (isDeveloper && user?.id) {
      const fetchDeveloperStellarAddress = async () => {
        try {
          const response = await fetch(`/api/users/${user.id}/stellar-address`)
          if (response.ok) {
            const data = await response.json()
            setStellarAddress(data.stellarAddress)
            console.log('✅ Developer Stellar address loaded:', data.stellarAddress)
          } else {
            console.log('No Stellar address found for developer, using demo address')
            setStellarAddress("GA3MC2DLXO7AHIITD637JKQCPD466DGWMFQPTJPJYAIE7XC3NRQCSR76")
          }
        } catch (error) {
          console.error('Error fetching developer Stellar address:', error)
          setStellarAddress("GA3MC2DLXO7AHIITD637JKQCPD466DGWMFQPTJPJYAIE7XC3NRQCSR76")
        }
      }

      fetchDeveloperStellarAddress()
    }
  }, [isDeveloper, user?.id])

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
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {isDeveloper && (
          <div className="space-y-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Developer Profile
                </h3>
                {githubProfile && (
                  <div className="flex items-center space-x-4">
                    <Image
                      src={githubProfile.avatar_url}
                      alt="Avatar"
                      width={64}
                      height={64}
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
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Your Stellar Address</h4>
                  {stellarAddressLoading ? (
                    <div className="text-sm text-gray-500">Loading address...</div>
                  ) : stellarAddress ? (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <code className="text-sm font-mono text-gray-800 break-all">
                        {stellarAddress}
                      </code>
                      <div className="mt-2 flex space-x-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(stellarAddress)}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
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
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Your Certificates & Badges
                  </h3>
                  {stellarAddress && stellarAddress !== "GA3MC2DLXO7AHIITD637JKQCPD466DGWMFQPTJPJYAIE7XC3NRQCSR76" && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/account/${stellarAddress}/assets`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      View on Stellar Explorer ↗
                    </a>
                  )}
                </div>

                {badgesLoading ? (
                  <div className="text-gray-500 flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                    Loading your badges...
                  </div>
                ) : developerBadges?.badges?.length > 0 ? (
                  <div className="space-y-3">
                    {developerBadges.badges.map((badge: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center space-x-3">
                          {badge.imageUrl ? (
                            <div className="flex-shrink-0">
                              <img
                                src={badge.imageUrl}
                                alt={badge.title || 'Achievement Badge'}
                                width={64}
                                height={64}
                                className="h-16 w-16 rounded-lg object-cover border-2 border-green-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-16 h-16 bg-green-200 rounded-lg flex items-center justify-center">
                              <span className="text-2xl">🏆</span>
                            </div>
                          )}
                          <div>
                            <h4 className="font-medium text-green-900">
                              {badge.title || '🏆 Achievement Badge'}
                            </h4>
                            <p className="text-sm text-green-700">
                              Earned from: {getOrganizationName(badge.issuerAddress) || 'Unknown Organization'}
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              Date: {badge.dateIssued ? new Date(badge.dateIssued).toLocaleDateString() : 'Unknown'}
                            </p>
                            {badge.description && (
                              <p className="text-xs text-green-600 mt-1">
                                {badge.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {badge.transactionHash && (
                            <a
                              href={`https://stellar.expert/explorer/testnet/tx/${badge.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              View Transaction ↗
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-gray-500 mt-4">
                      Total badges: {developerBadges.badges.length}
                    </div>
                  </div>
                ) : stellarAddress === "GA3MC2DLXO7AHIITD637JKQCPD466DGWMFQPTJPJYAIE7XC3NRQCSR76" ? (
                  <div className="text-gray-500">
                    <p className="mb-2">🔗 Connect your Stellar address to view badges</p>
                    <p className="text-xs">Your badges are stored on the Stellar blockchain and linked to your address.</p>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <p className="mb-2">🏆 No badges yet</p>
                    <p className="text-xs">Complete jobs, courses, or participate in events to earn blockchain certificates!</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Available Jobs
                  </h3>
                  <button
                    onClick={() => router.push("/jobs")}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Browse All Jobs →
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900">🔐 Direct Payment Escrow</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Find jobs with direct escrow protection - get paid immediately when work is approved
                    </p>
                    <button
                      onClick={() => router.push("/jobs")}
                      className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                    >
                      Find Jobs
                    </button>
                  </div>
                </div>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt="Organization Logo"
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-full"
                        onError={(e) => {
                          // Hide the image and show fallback div instead
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 font-bold text-xl">
                          {user.name?.charAt(0) || 'O'}
                        </span>
                      </div>
                    )}
                    <div>
                      <h4 className="text-xl font-semibold">{user.name}</h4>
                      <p className="text-gray-600">{user.email}</p>
                      <p className="text-sm text-gray-500 mt-1">Organization Account</p>
                    </div>
                  </div>
                  <StellarBalanceDisplay userId={user?.id} />
                </div>
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Your Events
                    </h3>
                    <button
                      onClick={() => router.push("/events/create")}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Create Event
                    </button>
                  </div>
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
                              {isOrganization && (
                                <div className="mt-3 text-sm text-gray-600 flex items-center justify-between">
                                  <div>
                                    <span className="font-medium">Badges Issued:</span>
                                    {badgeCounts[event.id] || 0} badges
                                  </div>
                                  {orgStellarAddress && badgeCounts[event.id] > 0 && (
                                    <a
                                      href={`https://stellar.expert/explorer/testnet/account/${orgStellarAddress}/assets`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                                    >
                                      🔗 view on chain
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                            {isOrganization && (
                              <button
                                onClick={() => {
                                  setSelectedEventForBadge(event)
                                  setEmitBadgeModalOpen(true)
                                }}
                                className="ml-4 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                              >
                                Emit Badge
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No events created yet.</p>
                      <button
                        onClick={() => router.push("/events/create")}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                      >
                        Create Your First Event
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Your Jobs
                    </h3>
                    <button
                      onClick={() => router.push("/jobs/create")}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      Post a Job
                    </button>
                  </div>
                  <OrganizationJobs userId={user?.id} router={router} />
                </div>
              </div>
            </div>
          </div>
        )}

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
      </main>
    </div>
  )
}

// Stellar Balance Display Component (for organization profile)
function StellarBalanceDisplay({ userId }: { userId?: string }) {
  const [balance, setBalance] = useState<string>('0')
  const [balanceUSD, setBalanceUSD] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchBalance = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/stellar/balance?userId=${userId}`)
      const data = await response.json()

      if (response.ok) {
        setBalance(data.xlmBalance || '0')
        setBalanceUSD(data.xlmBalanceUSD || 0)
      } else {
        console.error('Failed to fetch balance:', data.error)
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [userId])

  if (loading) {
    return (
      <div className="text-right">
        <div className="text-sm text-gray-500">Loading balance...</div>
      </div>
    )
  }

  return (
    <div className="text-right">
      <div className="text-lg font-bold text-green-600">
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(balanceUSD)}
      </div>
      <div className="text-sm text-gray-600">
        {new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4
        }).format(parseFloat(balance))} XLM
      </div>
    </div>
  )
}

// Organization Jobs Component
function OrganizationJobs({ userId, router }: { userId?: string, router: any }) {
  const [orgStellarAddress, setOrgStellarAddress] = useState<string | null>(null)

  const { data: jobsData } = useQuery({
    queryKey: ['organization-jobs', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required')

      const response = await fetch(`/api/jobs?organizationId=${encodeURIComponent(userId)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }
      return response.json()
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5000, // Refetch every 5 seconds for debugging
  })

  useEffect(() => {
    const fetchStellarAddress = async () => {
      if (!userId) return
      try {
        // Use the actual organization address that issues badges
        const actualAddress = 'GCR23HMPNGVYEKTVVGQDTVECMBER6DI7NJBD3EQITKRHEHH7GNHUXSIF'
        setOrgStellarAddress(actualAddress)
        console.log('🔍 DEBUG: OrganizationJobs using actual address:', actualAddress)
      } catch (error) {
        console.error('Error setting stellar address:', error)
      }
    }
    fetchStellarAddress()
  }, [userId])

  const jobs = jobsData?.jobs || []

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No jobs posted yet.</p>
        <button
          onClick={() => router.push('/jobs/create')}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
        >
          Post Your First Job
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {jobs.slice(0, 3).map((job: any) => (
        <div key={job.id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-semibold">{job.title}</h4>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{job.description}</p>
              {job.tags && job.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {job.tags.slice(0, 3).map((tag: string, index: number) => (
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
            <div className="ml-4 text-right">
              <div className="text-sm font-semibold text-green-600">
                {job.usdAmount ? (
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(parseFloat(job.usdAmount))
                ) : (
                  `${parseFloat(job.amount).toFixed(2)} XLM`
                )}
              </div>
              <div className="text-xs text-gray-500">
                <div className="flex items-center justify-between">
                  <span>
                    {job.status === 'open' ? '🟢 Open' :
                      job.status === 'in_progress' ? '🟡 In Progress' :
                        job.status === 'completed' ? '✅ Completed' : job.status}
                  </span>
                  {orgStellarAddress && job.escrowId && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/account/${orgStellarAddress}/payments`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      🔗 view escrow
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      {jobs.length > 3 && (
        <div className="text-center pt-2">
          <button
            onClick={() => router.push('/jobs')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View All Jobs ({jobs.length}) →
          </button>
        </div>
      )}
    </div>
  )
}

// Stellar Wallet Component
function StellarWalletSection({ userId }: { userId?: string }) {
  const [balance, setBalance] = useState<string>('0')
  const [balanceUSD, setBalanceUSD] = useState<number>(0)
  const [xlmPrice, setXlmPrice] = useState<number>(0)
  const [stellarAddress, setStellarAddress] = useState<string>('')
  const [accountExists, setAccountExists] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [funding, setFunding] = useState<boolean>(false)

  const fetchBalance = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/stellar/balance?userId=${userId}`)
      const data = await response.json()

      if (response.ok) {
        setBalance(data.xlmBalance || '0')
        setBalanceUSD(data.xlmBalanceUSD || 0)
        setXlmPrice(data.xlmPriceUSD || 0)
        setStellarAddress(data.stellarAddress || '')
        setAccountExists(data.accountExists || false)
      } else {
        console.error('Failed to fetch balance:', data.error)
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFundAccount = async () => {
    if (!userId) return

    try {
      setFunding(true)
      const response = await fetch('/api/stellar/fund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      const result = await response.json()

      if (response.ok) {
        alert(`🎉 Account funded successfully!\n\nYou received 10,000 XLM testnet tokens\nTransaction: ${result.transactionHash}`)
        // Refresh balance after funding
        setTimeout(() => {
          fetchBalance()
        }, 2000)
      } else {
        alert(`❌ Failed to fund account: ${result.error}`)
      }
    } catch (error) {
      console.error('Error funding account:', error)
      alert('❌ Error funding account. Please try again.')
    } finally {
      setFunding(false)
    }
  }

  // Fetch balance on mount
  useEffect(() => {
    fetchBalance()
  }, [userId])

  if (loading) {
    return <div className="text-sm text-gray-500">Loading wallet...</div>
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-medium text-gray-900">Wallet Balance</h4>
            <p className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }).format(balanceUSD)}
            </p>
            <p className="text-sm text-gray-600">
              {new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 7
              }).format(parseFloat(balance))} XLM
              {xlmPrice > 0 && (
                <span className="text-xs text-gray-400 ml-1">
                  @ {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4
                  }).format(xlmPrice)}/XLM
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <button
              onClick={fetchBalance}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>Address: {stellarAddress}</p>
          <p>Status: {accountExists ? '✅ Active' : '⚠️ Not funded'}</p>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleFundAccount}
          disabled={funding}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {funding ? 'Funding...' : '💰 Add Test Funds'}
        </button>

        <a
          href={`https://stellar.expert/explorer/testnet/account/${stellarAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-center"
        >
          🔍 View Explorer
        </a>
      </div>

      {!accountExists && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            ⚠️ Account not yet funded. Click "Add Test Funds" to get 10,000 XLM testnet tokens.
          </p>
        </div>
      )}
    </div>
  )
}
