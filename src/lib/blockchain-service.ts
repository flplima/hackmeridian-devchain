import {
  Horizon
} from "@stellar/stellar-sdk"

const server = new Horizon.Server("https://horizon-testnet.stellar.org")

// Smart contract configuration
const CONTRACT_ID = process.env.CERTIFICATE_CONTRACT_ID || "CBZM3AM3TGQ4OWJY2NCDNVTCNXGS7ZVLPUNXQRSRAEQBTDWPKJKCO2NI"

export interface BlockchainBadge {
  id: string
  eventId: string
  eventTitle: string
  recipientAddress: string
  issuerAddress: string
  transactionHash: string
  dateIssued: string
  contractAddress: string
  certificateId?: number
}

export class BlockchainService {
  /**
   * Get all badges issued by a specific organization address
   */
  static async getBadgesByOrganization(organizationAddress: string): Promise<BlockchainBadge[]> {
    try {
      console.log(`🔍 Fetching badges for organization: ${organizationAddress}`)

      // Get all outgoing payments from the organization address
      const payments = await server.payments()
        .forAccount(organizationAddress)
        .order('desc')
        .limit(200)
        .call()

      const badges: BlockchainBadge[] = []

      console.log(`📋 Processing ${payments.records.length} payment records`)

      for (const payment of payments.records) {
        console.log(`🔍 Checking payment: ${payment.transaction_hash}, type: ${payment.type}, from: ${payment.from}, amount: ${payment.amount}`)

        if (payment.type === 'payment' && payment.from === organizationAddress) {
          try {
            // Get transaction details to check memo and extract certificate data
            const transaction = await server.transactions()
              .transaction(payment.transaction_hash)
              .call()

            console.log(`📝 Transaction memo: "${transaction.memo}"`)

            // Check if this is a certificate transaction (more flexible detection)
            const isCertificate = (
              payment.amount === "0.0000001" || // Our certificate marker amount (primary detection)
              (transaction.memo && (
                transaction.memo.includes('CERTIFICATE') ||
                transaction.memo.includes('type":"CERTIFICATE') ||
                transaction.memo.startsWith('CERT:') // New compact format
              ))
            )

            console.log(`🎯 Is certificate: ${isCertificate}`)

            if (isCertificate) {
              const eventData: Record<string, string> = {
                event_id: 'unknown',
                event_name: 'Certificate',
                type: 'CERTIFICATE'
              }

              // Try to parse memo data
              try {
                if (transaction.memo) {
                  if (transaction.memo.startsWith('CERT:')) {
                    // New compact format: CERT:eventId
                    const eventId = transaction.memo.substring(5) // Remove 'CERT:' prefix
                    if (eventId) {
                      eventData.event_id = eventId
                      console.log(`📝 Extracted event_id from compact memo: ${eventId}`)
                    }
                  } else if (transaction.memo.includes('{')) {
                    // Legacy JSON format, try to parse but handle truncated memos
                    const memoToParse = transaction.memo
                    if (!transaction.memo.endsWith('}')) {
                      // If memo appears truncated, try to extract what we can
                      console.log('📝 Memo appears truncated, extracting available data')
                      // Look for event_id pattern
                      const eventIdMatch = transaction.memo.match(/"event_id"\s*:\s*"([^"]+)"/)
                      const eventNameMatch = transaction.memo.match(/"event_name"\s*:\s*"([^"]+)"/)
                      if (eventIdMatch) eventData.event_id = eventIdMatch[1]
                      if (eventNameMatch) eventData.event_name = eventNameMatch[1]
                    } else {
                      const memoData = JSON.parse(memoToParse)
                      if (memoData.event_id) eventData.event_id = memoData.event_id
                      if (memoData.event_name) eventData.event_name = memoData.event_name
                    }
                  }
                }
              } catch (parseError) {
                // If memo parsing fails, use transaction data
                console.log('Could not parse memo, using defaults:', parseError)
              }

              const badge: BlockchainBadge = {
                id: payment.transaction_hash,
                eventId: eventData.event_id,
                eventTitle: eventData.event_name,
                recipientAddress: payment.to || 'unknown',
                issuerAddress: organizationAddress,
                transactionHash: payment.transaction_hash,
                dateIssued: payment.created_at,
                contractAddress: CONTRACT_ID
              }

              badges.push(badge)
            }
          } catch (error) {
            console.error(`Error processing payment ${payment.transaction_hash}:`, error)
            continue
          }
        }
      }

      console.log(`📋 Found ${badges.length} badges for organization ${organizationAddress}`)
      return badges
    } catch (error) {
      console.error('❌ Error fetching badges from blockchain:', error)
      return []
    }
  }

  /**
   * Get badges for a specific event by checking all badges and filtering by event ID
   */
  static async getBadgesByEvent(eventId: string, organizationAddress: string): Promise<BlockchainBadge[]> {
    try {
      const allBadges = await this.getBadgesByOrganization(organizationAddress)
      // Match by full eventId or by the first 8 characters (for compact format)
      const shortEventId = eventId.substring(0, 8)
      return allBadges.filter(badge =>
        badge.eventId === eventId || badge.eventId === shortEventId
      )
    } catch (error) {
      console.error('❌ Error fetching badges for event:', error)
      return []
    }
  }

  /**
   * Get badge counts by event for an organization
   * Note: This method receives events from the API to properly match short event IDs from blockchain
   */
  static async getBadgeCountsByOrganization(organizationAddress: string, allEvents?: any[]): Promise<Record<string, number>> {
    try {
      const badges = await this.getBadgesByOrganization(organizationAddress)
      const counts: Record<string, number> = {}

      badges.forEach(badge => {
        const shortEventId = badge.eventId // This is the 8-char version from blockchain

        // If we have events data, try to find the full event ID that matches
        if (allEvents) {
          const matchingEvent = allEvents.find(event =>
            event.id === shortEventId || event.id.startsWith(shortEventId)
          )

          if (matchingEvent) {
            // Count using the full event ID
            counts[matchingEvent.id] = (counts[matchingEvent.id] || 0) + 1
          } else {
            // Fallback to short ID if no match found
            counts[shortEventId] = (counts[shortEventId] || 0) + 1
          }
        } else {
          // Without events data, just use the short ID
          counts[shortEventId] = (counts[shortEventId] || 0) + 1
        }
      })

      console.log(`📊 Badge counts:`, counts)
      return counts
    } catch (error) {
      console.error('❌ Error getting badge counts:', error)
      return {}
    }
  }

  /**
   * Verify a badge exists on the blockchain
   */
  static async verifyBadge(transactionHash: string): Promise<boolean> {
    try {
      console.log(`🔍 Verifying badge transaction: ${transactionHash}`)

      const transaction = await server.transactions()
        .transaction(transactionHash)
        .call()

      const isSuccessful = transaction.successful
      console.log(`✅ Badge verified: ${isSuccessful ? 'SUCCESS' : 'FAILED'}`)

      return isSuccessful
    } catch (error) {
      console.error('❌ Error verifying badge:', error)
      return false
    }
  }

  /**
   * Get all unique organizations that have issued badges
   */
  static async getIssuingOrganizations(): Promise<string[]> {
    try {
      // This would require scanning the entire blockchain, which is expensive
      // For now, we'll return known organization addresses
      // In production, you'd want to maintain an index of known organizations
      return []
    } catch (error) {
      console.error('❌ Error getting issuing organizations:', error)
      return []
    }
  }

  /**
   * Get account information and verify it exists on testnet
   */
  static async getAccountInfo(address: string) {
    try {
      const account = await server.loadAccount(address)
      const balances = account.balances.map(balance => ({
        asset_type: balance.asset_type,
        balance: balance.balance
      }))

      return { exists: true, account, balances }
    } catch (error) {
      console.error(`❌ Account ${address} not found or error:`, error)
      return { exists: false, account: null, balances: [] }
    }
  }
}