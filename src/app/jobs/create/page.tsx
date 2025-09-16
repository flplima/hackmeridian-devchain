"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function CreateJob() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    tags: "",
    requirements: "",
    createEscrow: true,
    deadline: "",
  })
  const [loading, setLoading] = useState(false)
  const [xlmPrice, setXlmPrice] = useState<number>(0)
  const [xlmAmount, setXlmAmount] = useState<number>(0)

  // Fetch XLM price on component mount
  useEffect(() => {
    const fetchXLMPrice = async () => {
      try {
        const response = await fetch('/api/stellar/price')
        if (response.ok) {
          const data = await response.json()
          setXlmPrice(data.xlm_usd)
        }
      } catch (error) {
        console.error('Error fetching XLM price:', error)
      }
    }

    fetchXLMPrice()
  }, [])

  // Convert USD to XLM when amount changes
  useEffect(() => {
    if (formData.amount && xlmPrice > 0) {
      const usdAmount = parseFloat(formData.amount)
      const xlmEquivalent = usdAmount / xlmPrice
      setXlmAmount(xlmEquivalent)
    } else {
      setXlmAmount(0)
    }
  }, [formData.amount, xlmPrice])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/auth/signin")
      return
    }

    // Skip provider check for now since auth is disabled
    // if (user.provider !== "linkedin") {
    //   router.push("/dashboard")
    //   return
    // }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const requestData = {
        ...formData,
        amount: xlmAmount.toString(), // Send XLM amount to API
        usdAmount: formData.amount, // Also send original USD amount for reference
        tags: formData.tags.split(",").map((tag) => tag.trim()),
        requirements: formData.requirements.split(",").map((req) => req.trim()),
        employerId: user?.id, // Add employer ID for escrow creation
      }

      console.log("Sending job creation request:", requestData)

      const response = await fetch("/api/jobs/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      if (response.ok) {
        router.push("/dashboard")
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Job creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
      }
    } catch (error) {
      console.error("Error creating job:", error)
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

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Create Job</h1>
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
                Job Title
              </label>
              <input
                type="text"
                id="title"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                required
                rows={4}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Payment Amount (USD)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="amount"
                  required
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="mt-1 block w-full pl-7 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              {xlmAmount > 0 && xlmPrice > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  ≈ {new Intl.NumberFormat('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 7
                  }).format(xlmAmount)} XLM
                  <span className="text-xs text-gray-400 ml-1">
                    @ {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4
                    }).format(xlmPrice)}/XLM
                  </span>
                </p>
              )}
              {xlmPrice === 0 && (
                <p className="mt-2 text-xs text-gray-400">
                  Loading XLM price...
                </p>
              )}
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                Tags (comma separated)
              </label>
              <input
                type="text"
                id="tags"
                placeholder="react, typescript, node.js"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="requirements" className="block text-sm font-medium text-gray-700">
                Requirements (comma separated)
              </label>
              <input
                type="text"
                id="requirements"
                placeholder="3+ years experience, portfolio required"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Escrow Settings</h3>

              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="createEscrow"
                  checked={formData.createEscrow}
                  onChange={(e) => setFormData({ ...formData, createEscrow: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="createEscrow" className="ml-2 block text-sm text-gray-700">
                  Create escrow for secure payment
                </label>
              </div>

              {formData.createEscrow && (
                <div className="space-y-4 ml-6 p-4 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    ✅ Direct escrow protection. Funds are held securely and released when you approve completed work.
                  </p>

                  <div>
                    <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
                      Project Deadline (optional)
                    </label>
                    <input
                      type="date"
                      id="deadline"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave empty for 30-day default deadline
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Job"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
