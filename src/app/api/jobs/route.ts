import { NextRequest, NextResponse } from "next/server"
import { serverDataStore } from "@/lib/server-data-store"

// Get all jobs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const employerName = searchParams.get('employerName')
    const organizationId = searchParams.get('organizationId')

    let jobs = await serverDataStore.getJobs()
    console.log("Total jobs in store:", jobs.length)
    console.log("Jobs:", jobs.map(j => ({ id: j.id, title: j.title, status: j.status })))

    // Filter by status if provided
    if (status) {
      jobs = jobs.filter(job => job.status === status)
    }

    // Filter by employer if provided
    if (employerName) {
      jobs = jobs.filter(job => job.employerName === employerName)
    }

    // Filter by organization ID if provided
    if (organizationId) {
      jobs = jobs.filter(job => job.employerId === organizationId)
    }

    // Sort by creation date (newest first)
    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      jobs,
      count: jobs.length
    })

  } catch (error) {
    console.error("Error fetching jobs:", error)
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    )
  }
}