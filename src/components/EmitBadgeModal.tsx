"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import UserSearchTypeahead from "@/components/UserSearchTypeahead"

interface Event {
  id: string
  title: string
  tags: string[]
}

interface User {
  id: string
  name: string
  email: string
  githubHandle: string
  githubId: number
  profileImage?: string
  stellarAddress?: string
}

interface Organization {
  id: string
  name: string
  description?: string
  stellarAddress?: string
}

interface Badge {
  id: string
  eventId: string
  eventTitle: string
  recipientAddress: string
  issuerAddress: string
  transactionHash: string
  dateIssued: string
  contractAddress: string
  certificateId?: number
}

interface EmitBadgeModalProps {
  isOpen: boolean
  onClose: () => void
  event: Event
}

export default function EmitBadgeModal({ isOpen, onClose, event }: EmitBadgeModalProps) {
  const { user } = useAuth()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [emittingBadge, setEmittingBadge] = useState(false)
  const [badges, setBadges] = useState<Badge[]>([])

  useEffect(() => {
    if (isOpen) {
      loadBadges()
    }
  }, [isOpen, event.id])

  // Get current organization from auth context
  const getCurrentOrganization = () => {
    console.log("Auth user:", user)

    // Check if this is an organization user
    const isOrganization = user?.userType === "organization"

    console.log("Is organization:", isOrganization)

    if (user && isOrganization) {
      // Use the user's ID (which should be the UUID) as the organization identifier
      const orgId = user.id || "unknown-org"
      return {
        id: orgId,
        name: user.name || "Current Organization",
        description: "Current logged organization"
      }
    }

    console.log("No organization user found - user is not an organization or not logged in")
    return null
  }

  const loadBadges = async () => {
    try {
      const currentOrganization = getCurrentOrganization()
      if (!currentOrganization?.id) {
        console.log("No organization available to fetch badges")
        return
      }

      console.log(`Loading badges for event ${event.id} from organization ${currentOrganization.id}`)
      console.log(`Badge fetch URL: /api/blockchain/badges?organizationId=${encodeURIComponent(currentOrganization.id)}&eventId=${event.id}`)

      const response = await fetch(`/api/blockchain/badges?organizationId=${encodeURIComponent(currentOrganization.id)}&eventId=${event.id}`)
      if (response.ok) {
        const data = await response.json()
        console.log(`Loaded ${data.badges?.length || 0} badges from blockchain`)
        setBadges(data.badges || [])
      } else {
        console.error("Failed to fetch badges from blockchain:", response.status, response.statusText)
        setBadges([])
      }
    } catch (error) {
      console.error("Error fetching badges from blockchain:", error)
      setBadges([])
    }
  }

  const emitBadge = async () => {
    const currentOrganization = getCurrentOrganization()
    if (!selectedUser || !currentOrganization?.id || !event) {
      alert("Please select a developer")
      return
    }

    // Use the stellar address from the user object (it should be populated from the search API)
    const stellarAddress = selectedUser.stellarAddress
    if (!stellarAddress) {
      alert("User does not have a Stellar address. Please try refreshing and selecting the user again.")
      return
    }

    setEmittingBadge(true)

    try {
      const response = await fetch(`/api/events/${event.id}/emit-badge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          developerAddress: stellarAddress,
          organizationId: currentOrganization.id,
          // masterToken would come from authenticated session in production
          masterToken: process.env.NEXT_PUBLIC_MASTER_TOKEN || "demo-token"
        }),
      })

      console.log(`Badge emission - Organization ID: ${currentOrganization.id}`)

      if (response.ok) {
        const result = await response.json()
        setSelectedUser(null)

        // Wait a moment for blockchain to process, then reload badges
        setTimeout(() => {
          loadBadges()
        }, 2000)

        alert(`🎉 Badge minted successfully on blockchain!\n\nDeveloper: ${selectedUser.name}\nOrganization: ${currentOrganization.name}\nTransaction: ${result.transactionHash}\n\n🔗 View on Stellar Explorer:\nhttps://stellar.expert/explorer/testnet/tx/${result.transactionHash}`)
      } else {
        const errorData = await response.json()
        console.error("Failed to emit badge:", errorData.error)
        alert("Failed to emit badge: " + errorData.error)
      }
    } catch (error) {
      console.error("Error emitting badge:", error)
      alert("Failed to emit badge")
    }

    setEmittingBadge(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden mx-4 relative">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Emit Badges - {event.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Emit Badge Form */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Emit Badge to Participant</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Select Developer
                </label>
                <UserSearchTypeahead
                  onUserSelect={(user) => {
                    console.log('Selected user:', user)
                    setSelectedUser(user)
                  }}
                  placeholder="Search for a developer..."
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-500">
                  🔗 This will mint a certificate directly to the blockchain
                </p>
              </div>
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-2 text-xs text-gray-500">
                  Debug: selectedUser={selectedUser ? 'true' : 'false'}, currentOrg={getCurrentOrganization()?.id ? 'true' : 'false'}
                </div>
              )}

              <button
                onClick={emitBadge}
                disabled={emittingBadge || !selectedUser || !getCurrentOrganization()?.id}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {emittingBadge ? "Emitting..." : "🏆 Emit Badge"}
              </button>
            </div>

            {/* Emitted Badges List */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Emitted Badges ({badges.length})</h3>
              {badges.length > 0 ? (
                <div className="space-y-3">
                  {badges.map((badge: Badge) => (
                    <div key={badge.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-green-700">🏆 {badge.eventTitle}</h4>
                          <p className="text-sm text-gray-600 font-mono break-all">
                            📍 {badge.recipientAddress}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Issued: {new Date(badge.dateIssued).toLocaleDateString()}
                          </p>
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${badge.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            🔗 View on Blockchain
                          </a>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded ml-2">
                          ⛓️ On-Chain
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-gray-400 font-mono">
                        Contract: {badge.contractAddress}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No badges emitted yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
