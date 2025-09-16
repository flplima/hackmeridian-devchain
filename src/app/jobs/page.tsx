"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import EmitBadgeModal from "@/components/EmitBadgeModal"

interface Job {
  id: string
  title: string
  description: string
  amount: string // XLM amount
  usdAmount?: string // USD amount for display
  tags: string[]
  requirements: string[]
  employerName: string
  employerImage: string
  createdAt: string
  status: string
  escrowId?: string
  freelancerId?: string
  stellarAmount?: string
}

interface Escrow {
  id: string
  jobId: string
  payerAddress: string
  payeeAddress?: string
  mediatorAddress: string
  tokenAddress: string
  amount: string
  state: string
  createdAt: string
  deadline: string
  escrowAccountId?: string
  transactionHash?: string
  releaseTransactionHash?: string
}

export default function JobsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [acceptingJob, setAcceptingJob] = useState<string | null>(null)
  const [completingJob, setCompletingJob] = useState<Job | null>(null)
  const [isEmitBadgeModalOpen, setIsEmitBadgeModalOpen] = useState(false)

  // Fetch jobs using React Query
  const { data: jobsData, refetch: refetchJobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await fetch('/api/jobs')
      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }
      return response.json()
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  })

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/auth/signin")
      return
    }
  }, [user, authLoading, router])

  const handleAcceptJob = async (jobId: string) => {
    if (!user?.id) return

    setAcceptingJob(jobId)
    try {
      const response = await fetch('/api/jobs/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          freelancerUserId: user.id,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        alert(`🎉 Job accepted successfully!\n\n${result.message}`)
        refetchJobs() // Refresh the jobs list
      } else {
        alert(`❌ Failed to accept job: ${result.error}`)
      }
    } catch (error) {
      console.error('Error accepting job:', error)
      alert('❌ Error accepting job. Please try again.')
    } finally {
      setAcceptingJob(null)
    }
  }

  const getEscrowStatus = (job: Job) => {
    if (!job.escrowId) return null

    return (
      <div className="mt-2 text-xs">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          🔐 Escrow Protected
        </span>
      </div>
    )
  }

  const canAcceptJob = (job: Job) => {
    return job.status === 'open' && !job.freelancerId && job.escrowId
  }

  const canCompleteJob = (job: Job) => {
    // Only the employer (organization) can complete jobs that have been accepted
    return job.status === 'accepted' && job.employerId === user?.id && job.escrowId && job.freelancerId
  }

  const handleCompleteJob = (job: Job) => {
    setCompletingJob(job)
    setIsEmitBadgeModalOpen(true)
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

  const jobs = jobsData?.jobs || []
  console.log("All jobs from API:", jobs)
  console.log("Jobs that can be accepted:", jobs.map(job => ({
    id: job.id,
    title: job.title,
    status: job.status,
    freelancerId: job.freelancerId,
    escrowId: job.escrowId,
    canAccept: canAcceptJob(job),
    canComplete: canCompleteJob(job)
  })))

  const availableJobs = jobs.filter((job: Job) => canAcceptJob(job))
  const completableJobs = jobs.filter((job: Job) => canCompleteJob(job))
  const allDisplayJobs = [...availableJobs, ...completableJobs]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Available Jobs</h1>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {allDisplayJobs.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs available</h3>
            <p className="text-gray-500">Check back later for new opportunities!</p>
          </div>
        ) : (
          <div>
            {availableJobs.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Jobs</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {availableJobs.map((job: Job) => (
                    <JobCard key={job.id} job={job} onAccept={handleAcceptJob} onComplete={null} acceptingJob={acceptingJob} />
                  ))}
                </div>
              </div>
            )}

            {completableJobs.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Jobs Ready to Complete</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {completableJobs.map((job: Job) => (
                    <JobCard key={job.id} job={job} onAccept={null} onComplete={handleCompleteJob} acceptingJob={null} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Job completion modal */}
        {completingJob && (
          <EmitBadgeModal
            isOpen={isEmitBadgeModalOpen}
            onClose={() => {
              setIsEmitBadgeModalOpen(false)
              setCompletingJob(null)
            }}
            event={{
              id: completingJob.id,
              title: completingJob.title,
              tags: completingJob.tags
            }}
            job={completingJob}
          />
        )}
      </main>
    </div>
  )
}

interface JobCardProps {
  job: Job
  onAccept: ((jobId: string) => void) | null
  onComplete: ((job: Job) => void) | null
  acceptingJob: string | null
}

function JobCard({ job, onAccept, onComplete, acceptingJob }: JobCardProps) {
  const getEscrowStatus = (job: Job) => {
    if (!job.escrowId) return null

    return (
      <div className="mt-2 text-xs">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          🔐 Escrow Protected
        </span>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
        <div className="text-right">
          {job.usdAmount ? (
            <>
              <span className="text-lg font-bold text-green-600">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(parseFloat(job.usdAmount))}
              </span>
              <p className="text-xs text-gray-500">
                {new Intl.NumberFormat('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4
                }).format(parseFloat(job.amount))} XLM
              </p>
            </>
          ) : (
            <span className="text-lg font-bold text-green-600">
              {new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 7
              }).format(parseFloat(job.amount))} XLM
            </span>
          )}
        </div>
      </div>

      <p className="text-gray-600 mb-4 line-clamp-3">{job.description}</p>

      {job.tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {job.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {job.requirements.length > 0 && job.requirements.some(req => req.trim()) && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Requirements:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {job.requirements.filter(req => req.trim()).map((req, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {getEscrowStatus(job)}

      <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
        <span>By {job.employerName}</span>
        <span>{new Date(job.createdAt).toLocaleDateString()}</span>
      </div>

      <div className="mt-6">
        {onAccept && (
          <button
            onClick={() => onAccept(job.id)}
            disabled={acceptingJob === job.id}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {acceptingJob === job.id ? 'Accepting...' : 'Accept Job'}
          </button>
        )}

        {onComplete && (
          <button
            onClick={() => onComplete(job)}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            🏆 Complete Job & Emit Badge
          </button>
        )}
      </div>
    </div>
  )
}