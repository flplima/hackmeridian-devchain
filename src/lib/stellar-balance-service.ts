import { Horizon } from "@stellar/stellar-sdk"

const server = new Horizon.Server("https://horizon-testnet.stellar.org")

export interface StellarBalance {
  balance: string
  asset_type: string
  asset_code?: string
  asset_issuer?: string
}

export interface AccountInfo {
  id: string
  sequence: string
  balances: StellarBalance[]
  exists: boolean
}

export class StellarBalanceService {
  /**
   * Get account information and balances from Stellar blockchain
   */
  static async getAccountInfo(stellarAddress: string): Promise<AccountInfo | null> {
    try {
      console.log(`Fetching account info for: ${stellarAddress}`)

      const account = await server.loadAccount(stellarAddress)

      return {
        id: account.id,
        sequence: account.sequence,
        balances: account.balances,
        exists: true
      }
    } catch (error: any) {
      console.log(`Account ${stellarAddress} does not exist or error occurred:`, error.message)

      // Return empty account info if account doesn't exist
      return {
        id: stellarAddress,
        sequence: "0",
        balances: [],
        exists: false
      }
    }
  }

  /**
   * Get XLM balance for an account
   */
  static async getXLMBalance(stellarAddress: string): Promise<string> {
    try {
      const accountInfo = await this.getAccountInfo(stellarAddress)

      if (!accountInfo || !accountInfo.exists) {
        return "0"
      }

      // Find native XLM balance
      const xlmBalance = accountInfo.balances.find(
        balance => balance.asset_type === "native"
      )

      return xlmBalance ? xlmBalance.balance : "0"
    } catch (error) {
      console.error("Error getting XLM balance:", error)
      return "0"
    }
  }


  /**
   * Check if account has sufficient balance for amount
   */
  static async hasSufficientBalance(
    stellarAddress: string,
    requiredAmount: string
  ): Promise<boolean> {
    try {
      const balance = await this.getXLMBalance(stellarAddress)
      const balanceNum = parseFloat(balance)
      const requiredNum = parseFloat(requiredAmount)

      // Reserve some XLM for transaction fees (0.1 XLM buffer)
      const reserveAmount = 0.1

      return balanceNum >= (requiredNum + reserveAmount)
    } catch (error) {
      console.error("Error checking balance:", error)
      return false
    }
  }

  /**
   * Convert stroops to XLM
   */
  static stroopsToXLM(stroops: string): string {
    const stroopsNum = parseInt(stroops)
    return (stroopsNum / 10000000).toFixed(7)
  }

  /**
   * Convert XLM to stroops
   */
  static xlmToStroops(xlm: string): string {
    const xlmNum = parseFloat(xlm)
    return Math.round(xlmNum * 10000000).toString()
  }

  /**
   * Get recent transactions for an account
   */
  static async getRecentTransactions(stellarAddress: string, limit: number = 10) {
    try {
      const transactionsResponse = await server.transactions()
        .forAccount(stellarAddress)
        .order("desc")
        .limit(limit)
        .call()

      return transactionsResponse.records
    } catch (error) {
      console.error("Error getting recent transactions:", error)
      return []
    }
  }

  /**
   * Get account creation instructions for testnet
   */
  static getTestnetFundingInfo(stellarAddress: string) {
    return {
      fundingUrl: `https://friendbot.stellar.org?addr=${stellarAddress}`,
      instructions: [
        "Visit Stellar Laboratory: https://laboratory.stellar.org/#account-creator",
        `Enter your address: ${stellarAddress}`,
        "Click 'Get test network lumens' to fund your account",
        "Wait a few seconds for the transaction to process"
      ]
    }
  }

}