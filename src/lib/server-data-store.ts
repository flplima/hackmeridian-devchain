export interface Event {
  id: string
  title: string
  tags: string[]
}

export interface Badge {
  id: string
  recipientName: string
  recipientEmail: string
  issuedAt: string
  eventId: string
}

export interface Job {
  id: string
  title: string
  description: string
  amount: string
  tags: string[]
  requirements: string[]
  employerName: string
  employerImage: string
  createdAt: string
  status: string
}

class ServerDataStore {
  private events: Event[] = []
  private badges: Badge[] = []
  private jobs: Job[] = []
  private initialized = false

  // Events
  addEvent(event: Event): void {
    this.events.push(event)
  }

  getEvents(): Event[] {
    this.ensureInitialized()
    return this.events
  }

  getEventById(id: string): Event | undefined {
    this.ensureInitialized()
    return this.events.find(event => event.id === id)
  }

  updateEvent(id: string, updates: Partial<Event>): Event | null {
    this.ensureInitialized()
    const index = this.events.findIndex(event => event.id === id)
    if (index !== -1) {
      this.events[index] = { ...this.events[index], ...updates }
      return this.events[index]
    }
    return null
  }

  // Badges
  addBadge(badge: Badge): void {
    this.ensureInitialized()
    this.badges.push(badge)
  }

  getBadges(): Badge[] {
    this.ensureInitialized()
    return this.badges
  }

  getBadgesByRecipient(recipientEmail: string): Badge[] {
    this.ensureInitialized()
    return this.badges.filter(badge => badge.recipientEmail === recipientEmail)
  }

  getBadgesByEvent(eventId: string): Badge[] {
    this.ensureInitialized()
    return this.badges.filter(badge => badge.eventId === eventId)
  }

  // Jobs
  addJob(job: Job): void {
    this.ensureInitialized()
    this.jobs.push(job)
  }

  getJobs(): Job[] {
    this.ensureInitialized()
    return this.jobs
  }

  getJobById(id: string): Job | undefined {
    this.ensureInitialized()
    return this.jobs.find(job => job.id === id)
  }

  getJobsByEmployer(employerName: string): Job[] {
    this.ensureInitialized()
    return this.jobs.filter(job => job.employerName === employerName)
  }

  // Utility methods
  reset(): void {
    this.events = []
    this.badges = []
    this.jobs = []
    this.initialized = false
  }

  // Initialize with some sample data
  private initializeSampleData(): void {
    if (this.initialized) return

    // Sample events
    const sampleEvents: Event[] = [
      {
        id: "event_sample_1",
        title: "Stellar Blockchain Hackathon 2024",
        tags: ["stellar", "blockchain", "defi", "web3"]
      },
      {
        id: "event_sample_2",
        title: "React Workshop",
        tags: ["react", "javascript", "frontend"]
      },
      {
        id: "event_sample_3",
        title: "AI/ML Bootcamp",
        tags: ["ai", "machine-learning", "python"]
      }
    ]

    sampleEvents.forEach(event => this.events.push(event))
    this.initialized = true
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initializeSampleData()
    }
  }
}

// Export singleton instance for server-side use
export const serverDataStore = new ServerDataStore()