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
  imageUrl?: string
  title?: string
  description?: string
}

export class BlockchainService {
  /**
   * Extract metadata from blockchain transaction data entries
   */
  private static async extractMetadataFromTransaction(transactionHash: string, shortEventId: string): Promise<{
    imageUrl?: string
    title?: string
    description?: string
    eventName?: string
  }> {
    try {
      const transaction = await server.transactions()
        .transaction(transactionHash)
        .call()

      // Get the transaction effects to find data entries
      const effects = await server.effects()
        .forTransaction(transactionHash)
        .call()

      let metadata: any = {}
      const metadataChunks: { [key: number]: string } = {}

      // Look for metadata in data entries
      for (const effect of effects.records) {
        if (effect.type === 'data_created' || effect.type === 'data_updated') {
          const dataEffect = effect as any
          const dataName = dataEffect.name

          if (dataName && dataName.includes(`cert_meta_${shortEventId}`)) {
            const dataValue = dataEffect.value

            if (dataName === `cert_meta_${shortEventId}`) {
              // Single chunk metadata
              try {
                const decodedValue = Buffer.from(dataValue, 'base64').toString('utf8')
                metadata = JSON.parse(decodedValue)
                break
              } catch (e) {
                console.log('Error parsing single metadata chunk:', e)
              }
            } else {
              // Multi-chunk metadata (cert_meta_eventId_0, cert_meta_eventId_1, etc.)
              const parts = dataName.split('_')
              if (parts.length >= 4) {
                const chunkIndex = parseInt(parts[parts.length - 1] || '0')
                try {
                  const decodedValue = Buffer.from(dataValue, 'base64').toString('utf8')
                  metadataChunks[chunkIndex] = decodedValue
                  console.log(`📊 Chunk ${chunkIndex}: ${decodedValue}`)
                } catch (e) {
                  console.log('Error parsing metadata chunk:', e)
                }
              }
            }
          }
        }
      }

      // Reconstruct multi-chunk metadata if needed
      if (Object.keys(metadataChunks).length > 0) {
        const sortedChunks = Object.keys(metadataChunks)
          .map(k => parseInt(k))
          .sort((a, b) => a - b)
          .map(k => metadataChunks[k])
          .join('')

        console.log(`🔧 Attempting to parse reconstructed JSON (${sortedChunks.length} chars):`, sortedChunks)

        try {
          // Try to parse as complete JSON first
          metadata = JSON.parse(sortedChunks)
          console.log('✅ Successfully parsed complete JSON metadata')
        } catch (e) {
          console.log('❌ Error parsing reconstructed JSON, trying individual field extraction:', e)

          // Try to fix incomplete JSON by adding missing closing characters
          let fixedJson = sortedChunks.trim()

          // Count open/close braces to see if we need to close the JSON
          const openBraces = (fixedJson.match(/\{/g) || []).length
          const closeBraces = (fixedJson.match(/\}/g) || []).length

          if (openBraces > closeBraces) {
            // Add missing closing quotes and braces
            if (!fixedJson.endsWith('"') && !fixedJson.endsWith('}')) {
              fixedJson += '"'
            }
            fixedJson += '}'.repeat(openBraces - closeBraces)

            console.log(`🔧 Attempting to fix JSON by adding ${openBraces - closeBraces} closing braces`)
            try {
              metadata = JSON.parse(fixedJson)
              console.log('✅ Successfully parsed fixed JSON metadata')
            } catch (fixError) {
              console.log('❌ Failed to parse fixed JSON, falling back to regex extraction')
            }
          }

          // If still failed, extract fields individually using regex
          if (!metadata || Object.keys(metadata).length === 0) {
            const imageUrlMatch = sortedChunks.match(/"imageUrl"\s*:\s*"([^"]*(?:\\.[^"]*)*)"?/)
            const titleMatch = sortedChunks.match(/"title"\s*:\s*"([^"]*)"/)
            const descriptionMatch = sortedChunks.match(/"description"\s*:\s*"([^"]*)"/)
            const eventNameMatch = sortedChunks.match(/"eventName"\s*:\s*"([^"]*)"/)

            metadata = {
              imageUrl: imageUrlMatch ? imageUrlMatch[1] : undefined,
              title: titleMatch ? titleMatch[1] : undefined,
              description: descriptionMatch ? descriptionMatch[1] : undefined,
              eventName: eventNameMatch ? eventNameMatch[1] : undefined
            }
            console.log('📊 Extracted partial metadata via regex:', metadata)
          }
        }
      }

      return {
        imageUrl: metadata.imageUrl,
        title: metadata.title,
        description: metadata.description,
        eventName: metadata.eventName
      }
    } catch (error) {
      console.log(`Could not extract metadata for transaction ${transactionHash}:`, error)
      return {}
    }
  }

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

  /**
   * Get all badges received by a specific recipient address (developer)
   */
  static async getBadgesByRecipient(recipientAddress: string): Promise<BlockchainBadge[]> {
    try {
      console.log(`🔍 Fetching badges received by: ${recipientAddress}`)

      // Get all incoming payments to the recipient address
      let payments
      try {
        payments = await server.payments()
          .forAccount(recipientAddress)
          .order('desc')
          .limit(200)
          .call()
      } catch (error) {
        if (error.name === 'NotFoundError') {
          console.log(`📝 Account ${recipientAddress} not found on Stellar network (may not be funded yet)`)
          return []
        }
        throw error
      }

      const badges: BlockchainBadge[] = []

      console.log(`📋 Processing ${payments.records.length} incoming payment records`)

      for (const payment of payments.records) {
        console.log(`🔍 Checking incoming payment: ${payment.transaction_hash}, type: ${payment.type}, to: ${payment.to}, amount: ${payment.amount}`)

        if (payment.type === 'payment' && payment.to === recipientAddress && payment.amount === '0.0000001') {
          try {
            // Get transaction details to check memo and extract certificate data
            const transaction = await server.transactions()
              .transaction(payment.transaction_hash)
              .call()

            // Handle the memo properly
            let memo = ''
            if (transaction.memo_type && transaction.memo) {
              if (transaction.memo_type === 'text') {
                memo = transaction.memo
              } else if (transaction.memo_type === 'hash' || transaction.memo_type === 'return') {
                memo = Buffer.from(transaction.memo, 'base64').toString('utf8')
              }
            }

            console.log(`📝 Transaction memo: "${memo}"`)

            // Check if this is a certificate/badge transaction
            const isCertificate = memo.includes('CERTIFICATE') || memo.includes('CERT:')
            console.log(`🎯 Is certificate: ${isCertificate}`)

            if (isCertificate) {
              let eventId = ''
              let eventTitle = 'Achievement Badge'

              // Extract event ID from memo
              if (memo.startsWith('CERT:')) {
                eventId = memo.substring(5).trim()
                console.log(`📝 Extracted event_id from compact memo: ${eventId}`)
              } else if (memo.includes('"event"')) {
                try {
                  // Try to parse as JSON if it looks like JSON
                  if (memo.startsWith('{')) {
                    const memoData = JSON.parse(memo)
                    eventId = memoData.event || ''
                  } else {
                    // Extract event from partial JSON
                    const eventMatch = memo.match(/"event":"([^"]+)"/)
                    if (eventMatch) {
                      eventId = eventMatch[1]
                    }
                  }
                } catch (e) {
                  console.log('📝 Memo appears truncated, extracting available data')
                }
              }

              // Extract metadata including image URL
              const metadata = await this.extractMetadataFromTransaction(payment.transaction_hash, eventId)
              console.log(`📊 Extracted metadata for ${payment.transaction_hash}:`, metadata)

              const badge: BlockchainBadge = {
                id: `badge_${payment.transaction_hash}`,
                eventId: eventId || 'unknown',
                eventTitle: metadata.eventName || eventTitle,
                recipientAddress,
                issuerAddress: payment.from || '',
                transactionHash: payment.transaction_hash,
                dateIssued: payment.created_at,
                contractAddress: CONTRACT_ID,
                certificateId: undefined,
                imageUrl: metadata.imageUrl,
                title: metadata.title,
                description: metadata.description
              }

              badges.push(badge)
              console.log(`🏆 Added badge: ${badge.id} for event ${eventId}`)
            }
          } catch (transactionError) {
            console.error(`❌ Error processing transaction ${payment.transaction_hash}:`, transactionError)
          }
        }
      }

      console.log(`🏆 Found ${badges.length} badges for recipient ${recipientAddress}`)
      return badges

    } catch (error) {
      console.error(`❌ Error fetching badges for recipient ${recipientAddress}:`, error)
      return []
    }
  }
}