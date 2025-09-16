export interface Event {
  id: string
  title: string
  tags: string[]
}

export interface Badge {
  id: string
  eventId: string
  eventTitle: string
  recipientAddress: string
  issuerAddress: string
  transactionHash: string
  dateIssued: string
  contractAddress: string
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

export interface UserAddress {
  userId: string
  stellarAddress: string
  createdAt: string
}

export interface Organization {
  id: string
  name: string
  description?: string
  createdAt: string
}

export interface User {
  id: string
  name: string
  email: string
  githubHandle: string
  githubId: number
}

class ServerDataStore {
  private events: Event[] = []
  private badges: Badge[] = []
  private jobs: Job[] = []
  private userAddresses: UserAddress[] = []
  private users: User[] = []
  private organizations: Organization[] = []
  private initialized = false

  // Events
  async addEvent(event: Event): Promise<void> {
    await this.ensureInitialized()
    this.events.push(event)
  }

  async getEvents(): Promise<Event[]> {
    await this.ensureInitialized()
    return this.events
  }

  async getEventById(id: string): Promise<Event | undefined> {
    await this.ensureInitialized()
    return this.events.find(event => event.id === id)
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | null> {
    await this.ensureInitialized()
    const index = this.events.findIndex(event => event.id === id)
    if (index !== -1) {
      this.events[index] = { ...this.events[index], ...updates }
      return this.events[index]
    }
    return null
  }

  // Badges
  async addBadge(badge: Badge): Promise<void> {
    await this.ensureInitialized()
    this.badges.push(badge)
  }

  async getBadges(): Promise<Badge[]> {
    await this.ensureInitialized()
    return this.badges
  }

  async getBadgesByRecipient(recipientAddress: string): Promise<Badge[]> {
    await this.ensureInitialized()
    return this.badges.filter(badge => badge.recipientAddress === recipientAddress)
  }

  async getBadgesByEvent(eventId: string): Promise<Badge[]> {
    await this.ensureInitialized()
    return this.badges.filter(badge => badge.eventId === eventId)
  }

  // Jobs
  async addJob(job: Job): Promise<void> {
    await this.ensureInitialized()
    this.jobs.push(job)
  }

  async getJobs(): Promise<Job[]> {
    await this.ensureInitialized()
    return this.jobs
  }

  async getJobById(id: string): Promise<Job | undefined> {
    await this.ensureInitialized()
    return this.jobs.find(job => job.id === id)
  }

  async getJobsByEmployer(employerName: string): Promise<Job[]> {
    await this.ensureInitialized()
    return this.jobs.filter(job => job.employerName === employerName)
  }

  // User Addresses
  async addUserAddress(userAddress: UserAddress): Promise<void> {
    await this.ensureInitialized()
    // Remove existing mapping for this user
    this.userAddresses = this.userAddresses.filter(ua => ua.userId !== userAddress.userId)
    // Add new mapping
    this.userAddresses.push(userAddress)
  }

  async getUserAddress(userId: string): Promise<UserAddress | undefined> {
    await this.ensureInitialized()
    return this.userAddresses.find(ua => ua.userId === userId)
  }

  async getUserByAddress(stellarAddress: string): Promise<UserAddress | undefined> {
    await this.ensureInitialized()
    return this.userAddresses.find(ua => ua.stellarAddress === stellarAddress)
  }

  async getAllUserAddresses(): Promise<UserAddress[]> {
    await this.ensureInitialized()
    return this.userAddresses
  }

  // Users
  async addUser(user: User): Promise<void> {
    await this.ensureInitialized()
    // Remove existing user with same ID
    this.users = this.users.filter(u => u.id !== user.id)
    // Add new/updated user
    this.users.push(user)
  }

  async getUsers(): Promise<User[]> {
    await this.ensureInitialized()
    return this.users
  }

  async getUserById(id: string): Promise<User | undefined> {
    await this.ensureInitialized()
    return this.users.find(user => user.id === id)
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureInitialized()
    return this.users.find(user => user.email === email)
  }

  async getUserByGithubHandle(githubHandle: string): Promise<User | undefined> {
    await this.ensureInitialized()
    return this.users.find(user => user.githubHandle === githubHandle)
  }

  async searchUsers(query: string): Promise<User[]> {
    await this.ensureInitialized()
    if (!query || query.trim().length === 0) {
      return this.users
    }

    const searchTerm = query.toLowerCase().trim()
    return this.users.filter(user =>
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      (user.githubHandle && user.githubHandle.toLowerCase().includes(searchTerm))
    )
  }

  // Organizations
  async addOrganization(organization: Organization): Promise<void> {
    await this.ensureInitialized()
    // Remove existing organization with same ID
    this.organizations = this.organizations.filter(o => o.id !== organization.id)
    // Add new/updated organization
    this.organizations.push(organization)
  }

  async getOrganizations(): Promise<Organization[]> {
    await this.ensureInitialized()
    return this.organizations
  }

  async getOrganizationById(id: string): Promise<Organization | undefined> {
    await this.ensureInitialized()
    return this.organizations.find(org => org.id === id)
  }

  async getOrganizationByName(name: string): Promise<Organization | undefined> {
    await this.ensureInitialized()
    return this.organizations.find(org => org.name.toLowerCase() === name.toLowerCase())
  }

  async searchOrganizations(query: string): Promise<Organization[]> {
    await this.ensureInitialized()
    if (!query || query.trim().length === 0) {
      return this.organizations
    }

    const searchTerm = query.toLowerCase().trim()
    return this.organizations.filter(org =>
      org.name.toLowerCase().includes(searchTerm) ||
      (org.description && org.description.toLowerCase().includes(searchTerm))
    )
  }

  // Utility methods
  reset(): void {
    this.events = []
    this.badges = []
    this.jobs = []
    this.userAddresses = []
    this.users = []
    this.organizations = []
    this.initialized = false
  }

  // Initialize with some sample data
  private async initializeSampleData(): Promise<void> {
    if (this.initialized) return

    // Sample events with fixed UUIDs for consistency
    const sampleEvents: Event[] = [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "Stellar Blockchain Hackathon 2024",
        tags: ["stellar", "blockchain", "defi", "web3"]
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        title: "React Workshop",
        tags: ["react", "javascript", "frontend"]
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440002",
        title: "AI/ML Bootcamp",
        tags: ["ai", "machine-learning", "python"]
      }
    ]

    sampleEvents.forEach(event => this.events.push(event))

    // Fetch and initialize sample user from GitHub
    try {
      const response = await fetch('https://api.github.com/users/flplima')
      if (response.ok) {
        const githubUser = await response.json()
        const sampleUser: User = {
          id: githubUser.id.toString(), // Use GitHub user ID
          name: githubUser.name || githubUser.login,
          email: githubUser.email || `${githubUser.login}@github.local`,
          githubHandle: githubUser.login,
          githubId: githubUser.id
        }
        this.users.push(sampleUser)
      }
    } catch (error) {
      console.error('Error fetching GitHub user:', error)
      // Fallback sample user
      const fallbackUser: User = {
        id: "89628972",
        name: "Felipe Lima",
        email: "flplima@github.local",
        githubHandle: "flplima",
        githubId: 89628972
      }
      this.users.push(fallbackUser)
    }

    // Sample organization with fixed UUID for consistency
    const stellarOrganization: Organization = {
      id: "550e8400-e29b-41d4-a716-446655442000",
      name: "Stellar Development Foundation",
      description: "Building the open financial system",
      createdAt: new Date().toISOString(),
    }

    this.organizations.push(stellarOrganization)
    this.initialized = true
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeSampleData()
    }
  }
}

// Export singleton instance for server-side use
export const serverDataStore = new ServerDataStore()
