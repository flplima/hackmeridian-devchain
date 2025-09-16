"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function CreateEvent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: "",
    tags: ""
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/auth/signin")
      return
    }

    // Only organizations can create events
    if (user.userType !== "organization") {
      router.push("/dashboard")
      return
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/events/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(",").map((tag) => tag.trim()).filter(tag => tag),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Event created successfully:", result)
        router.push("/dashboard")
      } else {
        const errorData = await response.json()
        console.error("Failed to create event:", errorData)
        alert("Failed to create event: " + (errorData.error || "Unknown error"))
      }
    } catch (error) {
      console.error("Error creating event:", error)
      alert("Error creating event. Please try again.")
    }

    setLoading(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user || user.userType !== "organization") {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Create Event</h1>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Event Title *
              </label>
              <input
                type="text"
                id="title"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Stellar Hackathon 2024"
              />
              <p className="mt-1 text-xs text-gray-500">
                This will be used as the event title when emitting badges
              </p>
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                Tags (comma separated)
              </label>
              <input
                type="text"
                id="tags"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="stellar, blockchain, hackathon, web3"
              />
              <p className="mt-1 text-xs text-gray-500">
                These tags will be associated with badges earned at this event
              </p>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Event Information</h3>
              <div className="bg-blue-50 rounded-md p-4">
                <p className="text-sm text-blue-800">
                  <strong>📅 Event Purpose:</strong> Events are used to categorize and organize badges.
                  When you emit badges to developers, they will be associated with this event.
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  <strong>🏆 Badge Emission:</strong> After creating this event, you'll be able to emit badges
                  to developers who participated in your event or completed work for your organization.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.title.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Event"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}