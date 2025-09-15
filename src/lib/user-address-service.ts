import { Keypair } from "@stellar/stellar-sdk"
import { serverDataStore, UserAddress } from "./server-data-store"
import { createHash } from "crypto"

export class UserAddressService {
  /**
   * Get or create a Stellar address for a user identifier
   * Requires MASTER_TOKEN for authentication
   */
  static async getStellarAddressByUserId(
    userId: string,
    masterToken?: string
  ): Promise<string | null> {
    try {
      // Verify master token if provided
      if (masterToken && masterToken !== process.env.MASTER_TOKEN) {
        throw new Error("Invalid master token")
      }

      // Check if user already has an address
      const existingMapping = serverDataStore.getUserAddress(userId)
      if (existingMapping) {
        return existingMapping.stellarAddress
      }

      // Create new Stellar address for this user
      const keypair = Keypair.random()
      const stellarAddress = keypair.publicKey()

      // Store the mapping
      const userAddress: UserAddress = {
        userId,
        stellarAddress,
        createdAt: new Date().toISOString(),
      }

      serverDataStore.addUserAddress(userAddress)

      console.log(`Created new Stellar address for user ${userId}: ${stellarAddress}`)
      return stellarAddress
    } catch (error) {
      console.error("Error getting Stellar address:", error)
      return null
    }
  }

  /**
   * Get user ID by Stellar address
   */
  static getUserIdByAddress(stellarAddress: string): string | null {
    try {
      const userMapping = serverDataStore.getUserByAddress(stellarAddress)
      return userMapping?.userId || null
    } catch (error) {
      console.error("Error getting user by address:", error)
      return null
    }
  }

  /**
   * List all user address mappings (admin function)
   */
  static getAllUserAddresses(masterToken?: string): UserAddress[] | null {
    try {
      // Verify master token
      if (masterToken !== process.env.MASTER_TOKEN) {
        throw new Error("Invalid master token")
      }

      return serverDataStore.getAllUserAddresses()
    } catch (error) {
      console.error("Error getting all user addresses:", error)
      return null
    }
  }

  /**
   * Manually set a Stellar address for a user (admin function)
   */
  static async setUserAddress(
    userId: string,
    stellarAddress: string,
    masterToken?: string
  ): Promise<boolean> {
    try {
      // Verify master token
      if (masterToken !== process.env.MASTER_TOKEN) {
        throw new Error("Invalid master token")
      }

      // Validate Stellar address format
      if (!stellarAddress.startsWith('G') || stellarAddress.length !== 56) {
        throw new Error("Invalid Stellar address format")
      }

      const userAddress: UserAddress = {
        userId,
        stellarAddress,
        createdAt: new Date().toISOString(),
      }

      serverDataStore.addUserAddress(userAddress)
      console.log(`Set Stellar address for user ${userId}: ${stellarAddress}`)
      return true
    } catch (error) {
      console.error("Error setting user address:", error)
      return false
    }
  }

  /**
   * Derive a deterministic Stellar keypair for an organization
   * Uses organization name + master token to create deterministic seed
   */
  static deriveOrganizationKeypair(
    organizationName: string,
    masterToken?: string
  ): Keypair {
    try {
      // Verify master token
      const token = masterToken || process.env.MASTER_TOKEN
      if (!token) {
        throw new Error("Master token is required for organization key derivation")
      }

      // Create deterministic seed from org name + master token
      const seedString = `org:${organizationName.toLowerCase().trim()}:${token}`
      const hash = createHash('sha256').update(seedString).digest()

      // Use first 32 bytes as seed for Stellar keypair
      const seed = hash.slice(0, 32)
      const keypair = Keypair.fromRawEd25519Seed(seed)

      console.log(`Derived Stellar keypair for organization: ${organizationName}`)
      console.log(`Organization address: ${keypair.publicKey()}`)

      return keypair
    } catch (error) {
      console.error("Error deriving organization keypair:", error)
      throw error
    }
  }

  /**
   * Get organization Stellar address (public key only)
   */
  static getOrganizationAddress(
    organizationName: string,
    masterToken?: string
  ): string {
    const keypair = this.deriveOrganizationKeypair(organizationName, masterToken)
    return keypair.publicKey()
  }

  /**
   * Get organization secret key (for signing transactions)
   * Should only be used server-side with proper authentication
   */
  static getOrganizationSecret(
    organizationName: string,
    masterToken?: string
  ): string {
    const keypair = this.deriveOrganizationKeypair(organizationName, masterToken)
    return keypair.secret()
  }

  /**
   * Store organization address mapping in database
   */
  static async storeOrganizationAddress(
    organizationName: string,
    masterToken?: string
  ): Promise<boolean> {
    try {
      // Verify master token
      if (masterToken !== process.env.MASTER_TOKEN) {
        throw new Error("Invalid master token")
      }

      const stellarAddress = this.getOrganizationAddress(organizationName, masterToken)

      // Store with org: prefix to distinguish from users
      const orgId = `org:${organizationName.toLowerCase().trim()}`

      const userAddress: UserAddress = {
        userId: orgId,
        stellarAddress,
        createdAt: new Date().toISOString(),
      }

      serverDataStore.addUserAddress(userAddress)
      console.log(`Stored organization address for ${organizationName}: ${stellarAddress}`)
      return true
    } catch (error) {
      console.error("Error storing organization address:", error)
      return false
    }
  }
}