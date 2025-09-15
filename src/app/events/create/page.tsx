"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function CreateEvent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [testSession, setTestSession] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: "",
    tags: "",
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const testSessionData = localStorage.getItem("test-session")
      if (testSessionData) {
        setTestSession(JSON.parse(testSessionData))
        return
      }
    }

    if (status === "loading") return

    if (!session) {
      router.push("/auth/signin")
      return
    }

    if (session.provider !== "linkedin") {
      router.push("/dashboard")
      return
    }
  }, [session, status, router])

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
          title: formData.title,
          tags: formData.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        }),
      })

      if (response.ok) {
        router.push("/dashboard")
      } else {
        const errorData = await response.json()
        console.error("Failed to create event:", errorData.error)
        alert("Failed to create event: " + errorData.error)
      }
    } catch (error) {
      console.error("Error creating event:", error)
      alert("Error creating event")
    }

    setLoading(false)
  }

  const currentSession = testSession || session
  if (status === "loading" && !testSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!currentSession || (currentSession.provider !== "linkedin" && !testSession)) {
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
                Event Title
              </label>
              <input
                type="text"
                id="title"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Stellar Blockchain Hackathon 2024"
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                Tags (comma separated)
              </label>
              <input
                type="text"
                id="tags"
                placeholder="react, blockchain, web3, stellar"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
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