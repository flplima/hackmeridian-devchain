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



interface Job {
  id: string
  title: string
  description: string
  amount: string
  usdAmount?: string
  tags: string[]
  requirements: string[]
  employerId?: string
  employerName: string
  employerImage: string
  createdAt: string
  status: string
  escrowId?: string
  freelancerId?: string
  stellarAmount?: string
}

interface EmitBadgeModalProps {
  isOpen: boolean
  onClose: () => void
  event: Event
  job?: Job
}

export default function EmitBadgeModal({ isOpen, onClose, event, job }: EmitBadgeModalProps) {
  const { user } = useAuth()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [emittingBadge, setEmittingBadge] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [badgeTitle, setBadgeTitle] = useState("")
  const [badgeDescription, setBadgeDescription] = useState("")
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [customPrompt, setCustomPrompt] = useState("")
  const [userExists, setUserExists] = useState<boolean | null>(null)
  const [checkingUser, setCheckingUser] = useState(false)

  useEffect(() => {
    if (currentStep === 2 && badgeTitle && !generatedImage) {
      generateBadgeImage()
    }
  }, [currentStep, badgeTitle, generatedImage])

  // Check if user exists when selected
  const checkUserExists = async (user: User) => {
    if (!user.githubHandle) {
      setUserExists(false)
      return
    }

    setCheckingUser(true)
    try {
      const response = await fetch(`/api/users/search?q=${user.githubHandle}`)
      if (response.ok) {
        const data = await response.json()
        const foundUser = data.users.find((u: User) => u.githubHandle === user.githubHandle)
        setUserExists(!!foundUser)
      } else {
        setUserExists(false)
      }
    } catch (error) {
      console.error('Error checking user existence:', error)
      setUserExists(false)
    }
    setCheckingUser(false)
  }

  const generateBadgeImage = async () => {
    if (!badgeTitle.trim()) return

    setGeneratingImage(true)
    try {
      const response = await fetch('/api/generate-badge-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: badgeTitle,
          description: badgeDescription,
          customPrompt: customPrompt,
        }),
      })

      if (response.ok) {
        const { imageUrl } = await response.json()
        setGeneratedImage(imageUrl)
      } else {
        console.error('Failed to generate image')
        alert('Failed to generate badge image')
      }
    } catch (error) {
      console.error('Error generating image:', error)
      alert('Error generating badge image')
    }
    setGeneratingImage(false)
  }

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
      let response

      if (job) {
        // Complete job and emit badge
        response = await fetch(`/api/jobs/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobId: job.id,
            freelancerAddress: stellarAddress,
            badgeTitle: badgeTitle,
            badgeDescription: badgeDescription,
            imageUrl: generatedImage,
            organizationId: currentOrganization.id,
            masterToken: process.env.NEXT_PUBLIC_MASTER_TOKEN || "demo-token"
          }),
        })
      } else {
        // Regular badge emission
        response = await fetch(`/api/events/${event.id}/emit-badge`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            developerAddress: stellarAddress,
            organizationId: currentOrganization.id,
            badgeTitle: badgeTitle,
            badgeDescription: badgeDescription,
            imageUrl: generatedImage,
            masterToken: process.env.NEXT_PUBLIC_MASTER_TOKEN || "demo-token"
          }),
        })
      }

      console.log(`Badge emission - Organization ID: ${currentOrganization.id}`)

      if (response.ok) {
        const result = await response.json()
        setSelectedUser(null)
        console.log(result)

        if (job) {
          alert(`🎉 Job completed successfully!\n\n• Badge minted on blockchain\n• Payment released to developer\n• Job marked as completed\n\nDeveloper: ${selectedUser.name}\nPayment: ${job.usdAmount} USD (${job.amount} XLM)\nTransaction: ${result.transactionHash}\n\n🔗 View on Stellar Explorer:\nhttps://stellar.expert/explorer/testnet/tx/${result.transactionHash}`)
        } else {
          alert(`🎉 Badge minted successfully on blockchain!\n\nDeveloper: ${selectedUser.name}\nOrganization: ${currentOrganization.name}\nTransaction: ${result.transactionHash}\n\n🔗 View on Stellar Explorer:\nhttps://stellar.expert/explorer/testnet/tx/${result.transactionHash}`)
        }
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
            {/* Step Indicator */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-4">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  1
                </div>
                <div className={`h-1 w-16 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  2
                </div>
              </div>
            </div>

            {/* Step 1: Badge Details */}
            {currentStep === 1 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Step 1: Badge Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Badge Title *
                    </label>
                    <input
                      type="text"
                      value={badgeTitle}
                      onChange={(e) => setBadgeTitle(e.target.value)}
                      placeholder="e.g., Hackathon Participant"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Badge Description (optional)
                    </label>
                    <textarea
                      value={badgeDescription}
                      onChange={(e) => setBadgeDescription(e.target.value)}
                      placeholder="e.g., Awarded for participating in the blockchain hackathon"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={!badgeTitle.trim()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Select Developer and Generate Image */}
            {currentStep === 2 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Step 2: Select Developer</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left side: Developer selection */}
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Developer
                      </label>
                      <UserSearchTypeahead
                        onUserSelect={(user) => {
                          console.log('Selected user:', user)
                          setSelectedUser(user)
                          setUserExists(null) // Reset validation
                          checkUserExists(user) // Check if user exists
                        }}
                        placeholder="Search for a developer..."
                        className="w-full"
                      />
                      {job ? (
                        <div className="mt-2 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm text-blue-800 font-medium">
                            🚀 Job Completion: This will release the escrow payment and emit a badge
                          </p>
                          <div className="mt-2 text-xs text-blue-700">
                            <p>• Payment: {job.usdAmount} USD ({job.amount} XLM) will be sent to the developer</p>
                            <p>• Job will be marked as completed</p>
                            <p>• Badge will be minted on the blockchain</p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-gray-500">
                          🔗 This will mint a certificate directly to the blockchain
                        </p>
                      )}

                      {/* User validation status */}
                      {selectedUser && (
                        <div className="mt-2">
                          {checkingUser ? (
                            <p className="text-xs text-gray-500">🔄 Checking user in database...</p>
                          ) : userExists === false ? (
                            <div className="p-2 bg-red-50 rounded-md">
                              <p className="text-xs text-red-700">
                                {job ? (
                                  <>❌ User not found in database. The selected developer must be registered to receive payments.</>
                                ) : (
                                  <>⚠️ User not in database, but event badges can still be emitted.</>
                                )}
                              </p>
                            </div>
                          ) : userExists === true ? (
                            <div className="p-2 bg-green-50 rounded-md">
                              <p className="text-xs text-green-700">
                                ✅ User found in database. Ready to proceed.
                              </p>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Debug info */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mb-2 text-xs text-gray-500">
                        Debug: selectedUser={selectedUser ? 'true' : 'false'}, currentOrg={getCurrentOrganization()?.id ? 'true' : 'false'}
                      </div>
                    )}

                    <div className="flex space-x-3">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
                      >
                        Back
                      </button>
                      <button
                        onClick={emitBadge}
                        disabled={emittingBadge || !selectedUser || !getCurrentOrganization()?.id || (job && userExists === false) || checkingUser}
                        className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {emittingBadge ? (job ? "Completing Job..." : "Emitting...") : (job ? "🏆 Complete Job & Emit Badge" : "🏆 Emit Badge")}
                      </button>
                    </div>
                  </div>

                  {/* Right side: AI Generated Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Badge Preview
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {generatingImage ? (
                        <div className="flex flex-col items-center justify-center h-48" style={{ aspectRatio: '1/1' }}>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                          <p className="text-sm text-gray-600">Generating AI image...</p>
                        </div>
                      ) : generatedImage ? (
                        <div className="space-y-2">
                          <img
                            src={generatedImage}
                            alt="Generated badge"
                            className="w-full h-48 object-contain rounded-md bg-white"
                            style={{ aspectRatio: '1/1' }}
                          />
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={customPrompt}
                              onChange={(e) => setCustomPrompt(e.target.value)}
                              placeholder="Custom prompt (optional)"
                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              onClick={generateBadgeImage}
                              disabled={generatingImage}
                              className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-md flex items-center justify-center w-full"
                            >
                              🔄 Regenerate
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-500" style={{ aspectRatio: '1/1' }}>
                          <p className="text-sm">AI-generated badge image will appear here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
