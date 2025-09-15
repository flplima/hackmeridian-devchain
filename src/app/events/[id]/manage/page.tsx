"use client"

import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"

interface Event {
  id: string
  title: string
  tags: string[]
}

interface Badge {
  id: string
  recipientName: string
  recipientEmail: string
  issuedAt: string
  eventId: string
}

export default function ManageEvent() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
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
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [participantEmail, setParticipantEmail] = useState("")
  const [participantName, setParticipantName] = useState("")
  const [emittingBadge, setEmittingBadge] = useState(false)
  const [badges, setBadges] = useState<Badge[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const testSessionData = localStorage.getItem("test-session")
      if (testSessionData) {
        setTestSession(JSON.parse(testSessionData))
      }
    }

    loadEvent()
    loadBadges()
  }, [params.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadEvent = async () => {
    try {
      const response = await fetch(`/api/events/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setEvent(data.event)
      } else {
        console.error("Failed to fetch event")
      }
    } catch (error) {
      console.error("Error fetching event:", error)
    }
    setLoading(false)
  }

  const loadBadges = async () => {
    try {
      const response = await fetch(`/api/badges?eventId=${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setBadges(data.badges)
      } else {
        console.error("Failed to fetch badges")
      }
    } catch (error) {
      console.error("Error fetching badges:", error)
    }
  }

  const emitBadge = async () => {
    if (!participantEmail || !participantName || !event) {
      alert("Please enter both participant name and email")
      return
    }

    setEmittingBadge(true)

    try {
      const response = await fetch("/api/badges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientName: participantName,
          recipientEmail: participantEmail,
          eventId: event.id,
        }),
      })

      if (response.ok) {
        setParticipantEmail("")
        setParticipantName("")
        loadBadges() // Reload badges to show the new one
        alert(`Badge emitted successfully to ${participantName}!`)
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

  const currentSession = testSession || session

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Event not found</div>
      </div>
    )
  }

  if (!currentSession || (!testSession || testSession.provider !== "linkedin")) {
    router.push("/auth/signin")
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Manage Event</h1>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">{event.title}</h2>
            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
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

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Emit Badge to Participant</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="participantName" className="block text-sm font-medium text-gray-700">
                  Participant Name
                </label>
                <input
                  type="text"
                  id="participantName"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Felipe Lima"
                />
              </div>
              <div>
                <label htmlFor="participantEmail" className="block text-sm font-medium text-gray-700">
                  Participant Email
                </label>
                <input
                  type="email"
                  id="participantEmail"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={participantEmail}
                  onChange={(e) => setParticipantEmail(e.target.value)}
                  placeholder="flplima@example.com"
                />
              </div>
            </div>
            <button
              onClick={emitBadge}
              disabled={emittingBadge || !participantEmail || !participantName}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {emittingBadge ? "Emitting..." : "🏆 Emit Badge"}
            </button>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Emitted Badges ({badges.length})</h3>
            {badges.length > 0 ? (
              <div className="space-y-3">
                {badges.map((badge: Badge) => (
                  <div key={badge.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{badge.recipientName}</h4>
                        <p className="text-sm text-gray-600">{badge.recipientEmail}</p>
                        <p className="text-xs text-gray-500">
                          Issued on {new Date(badge.issuedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        🏆 Event Badge
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No badges emitted yet.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}