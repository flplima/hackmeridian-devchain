import { Keypair } from "@stellar/stellar-sdk"
import { serverDataStore, UserAddress } from "./server-data-store"
import { createHash } from "crypto"
import { v4 as uuidv4 } from "uuid"

export class UserAddressService {
  /**
   * Get or create a Stellar address for a user UUID
   * Uses deterministic derivation based on UUID + master token
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
      const existingMapping = await serverDataStore.getUserAddress(userId)
      if (existingMapping) {
        return existingMapping.stellarAddress
      }

      // Create deterministic Stellar address for this user UUID
      const stellarAddress = this.deriveAddressFromUUID(userId, masterToken)

      // Store the mapping
      const userAddress: UserAddress = {
        userId,
        stellarAddress,
        createdAt: new Date().toISOString(),
      }

      await serverDataStore.addUserAddress(userAddress)

      console.log(`Created Stellar address for user ${userId}: ${stellarAddress}`)
      return stellarAddress
    } catch (error) {
      console.error("Error getting Stellar address:", error)
      return null
    }
  }

  /**
   * Get or create a Stellar address for a GitHub user ID
   * Uses deterministic derivation based on GitHub ID + master token
   */
  static async getStellarAddressByGithubId(
    githubId: number,
    masterToken?: string
  ): Promise<string | null> {
    try {
      // Verify master token if provided
      if (masterToken && masterToken !== process.env.MASTER_TOKEN) {
        throw new Error("Invalid master token")
      }

      // Use GitHub ID as the user identifier
      const userId = githubId.toString()

      // Check if user already has an address
      const existingMapping = await serverDataStore.getUserAddress(userId)
      if (existingMapping) {
        return existingMapping.stellarAddress
      }

      // Create deterministic Stellar address for this GitHub ID
      const stellarAddress = this.deriveAddressFromGithubId(githubId, masterToken)

      // Store the mapping
      const userAddress: UserAddress = {
        userId,
        stellarAddress,
        createdAt: new Date().toISOString(),
      }

      await serverDataStore.addUserAddress(userAddress)

      console.log(`Created Stellar address for GitHub user ${githubId}: ${stellarAddress}`)
      return stellarAddress
    } catch (error) {
      console.error("Error getting Stellar address:", error)
      return null
    }
  }

  /**
   * Get user ID by Stellar address
   */
  static async getUserIdByAddress(stellarAddress: string): Promise<string | null> {
    try {
      const userMapping = await serverDataStore.getUserByAddress(stellarAddress)
      return userMapping?.userId || null
    } catch (error) {
      console.error("Error getting user by address:", error)
      return null
    }
  }

  /**
   * List all user address mappings (admin function)
   */
  static async getAllUserAddresses(masterToken?: string): Promise<UserAddress[] | null> {
    try {
      // Verify master token
      if (masterToken !== process.env.MASTER_TOKEN) {
        throw new Error("Invalid master token")
      }

      return await serverDataStore.getAllUserAddresses()
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

      await serverDataStore.addUserAddress(userAddress)
      console.log(`Set Stellar address for user ${userId}: ${stellarAddress}`)
      return true
    } catch (error) {
      console.error("Error setting user address:", error)
      return false
    }
  }

  /**
   * Derive a deterministic Stellar address from UUID + master token
   */
  static deriveAddressFromUUID(
    uuid: string,
    masterToken?: string
  ): string {
    try {
      // Verify master token
      const token = masterToken || process.env.MASTER_TOKEN
      if (!token) {
        throw new Error("Master token is required for address derivation")
      }

      // Create deterministic seed from UUID + master token
      const seedString = `${uuid}:${token}`
      const hash = createHash('sha256').update(seedString).digest()

      // Use first 32 bytes as seed for Stellar keypair
      const seed = hash.slice(0, 32)
      const keypair = Keypair.fromRawEd25519Seed(seed)

      return keypair.publicKey()
    } catch (error) {
      console.error("Error deriving address from UUID:", error)
      throw error
    }
  }

  /**
   * Derive a deterministic Stellar address from GitHub ID + master token
   */
  static deriveAddressFromGithubId(
    githubId: number,
    masterToken?: string
  ): string {
    try {
      // Verify master token
      const token = masterToken || process.env.MASTER_TOKEN
      if (!token) {
        throw new Error("Master token is required for address derivation")
      }

      // Create deterministic seed from GitHub ID + master token
      const seedString = `github:${githubId}:${token}`
      const hash = createHash('sha256').update(seedString).digest()

      // Use first 32 bytes as seed for Stellar keypair
      const seed = hash.slice(0, 32)
      const keypair = Keypair.fromRawEd25519Seed(seed)

      return keypair.publicKey()
    } catch (error) {
      console.error("Error deriving address from GitHub ID:", error)
      throw error
    }
  }

  /**
   * Derive a deterministic Stellar keypair from UUID + master token
   */
  static deriveKeypairFromUUID(
    uuid: string,
    masterToken?: string
  ): Keypair {
    try {
      // Verify master token
      const token = masterToken || process.env.MASTER_TOKEN
      if (!token) {
        throw new Error("Master token is required for keypair derivation")
      }

      // Create deterministic seed from UUID + master token
      const seedString = `${uuid}:${token}`
      const hash = createHash('sha256').update(seedString).digest()

      // Use first 32 bytes as seed for Stellar keypair
      const seed = hash.slice(0, 32)
      const keypair = Keypair.fromRawEd25519Seed(seed)

      return keypair
    } catch (error) {
      console.error("Error deriving keypair from UUID:", error)
      throw error
    }
  }

  /**
   * Generate a new UUID for users or organizations
   */
  static generateUUID(): string {
    return uuidv4()
  }

  /**
   * Derive a deterministic Stellar keypair for an organization UUID
   * Uses organization UUID + master token to create deterministic seed
   */
  static deriveOrganizationKeypair(
    organizationUUID: string,
    masterToken?: string
  ): Keypair {
    return this.deriveKeypairFromUUID(organizationUUID, masterToken)
  }

  /**
   * Get organization Stellar address (public key only)
   */
  static getOrganizationAddress(
    organizationUUID: string,
    masterToken?: string
  ): string {
    return this.deriveAddressFromUUID(organizationUUID, masterToken)
  }

  /**
   * Get organization secret key (for signing transactions)
   * Should only be used server-side with proper authentication
   */
  static getOrganizationSecret(
    organizationUUID: string,
    masterToken?: string
  ): string {
    const keypair = this.deriveOrganizationKeypair(organizationUUID, masterToken)
    return keypair.secret()
  }

  /**
   * Store organization address mapping in database
   */
  static async storeOrganizationAddress(
    organizationUUID: string,
    masterToken?: string
  ): Promise<boolean> {
    try {
      // Verify master token
      if (masterToken !== process.env.MASTER_TOKEN) {
        throw new Error("Invalid master token")
      }

      const stellarAddress = this.getOrganizationAddress(organizationUUID, masterToken)

      const userAddress: UserAddress = {
        userId: organizationUUID,
        stellarAddress,
        createdAt: new Date().toISOString(),
      }

      await serverDataStore.addUserAddress(userAddress)
      console.log(`Stored organization address for ${organizationUUID}: ${stellarAddress}`)
      return true
    } catch (error) {
      console.error("Error storing organization address:", error)
      return false
    }
  }
}