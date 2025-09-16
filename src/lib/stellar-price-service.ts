export interface PriceData {
  usd: number
  last_updated: string
}

export class StellarPriceService {
  private static cachedPrice: { price: number; timestamp: number } | null = null
  private static readonly CACHE_DURATION = 60000 // 1 minute

  /**
   * Get current XLM price in USD
   */
  static async getXLMPriceUSD(): Promise<number> {
    try {
      // Check cache first
      const now = Date.now()
      if (
        this.cachedPrice &&
        now - this.cachedPrice.timestamp < this.CACHE_DURATION
      ) {
        return this.cachedPrice.price
      }

      // Fetch from CoinGecko API
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd',
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const price = data.stellar?.usd

      if (typeof price !== 'number') {
        throw new Error('Invalid price data received')
      }

      // Update cache
      this.cachedPrice = {
        price,
        timestamp: now
      }

      return price
    } catch (error) {
      console.error('Error fetching XLM price:', error)
      // Return a fallback price if API fails (approximate recent price)
      return 0.11 // Fallback price in USD
    }
  }

  /**
   * Convert XLM amount to USD
   */
  static async xlmToUSD(xlmAmount: string | number): Promise<number> {
    const xlmNum = typeof xlmAmount === 'string' ? parseFloat(xlmAmount) : xlmAmount
    const priceUSD = await this.getXLMPriceUSD()
    return xlmNum * priceUSD
  }

  /**
   * Convert USD amount to XLM
   */
  static async usdToXLM(usdAmount: string | number): Promise<number> {
    const usdNum = typeof usdAmount === 'string' ? parseFloat(usdAmount) : usdAmount
    const priceUSD = await this.getXLMPriceUSD()
    return usdNum / priceUSD
  }

  /**
   * Format USD amount as currency string with comma separators
   */
  static formatUSD(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  /**
   * Format XLM amount with proper precision and comma separators
   */
  static formatXLM(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 7
    }).format(amount) + ' XLM'
  }

  /**
   * Format number with comma separators (for general use)
   */
  static formatNumber(amount: number, decimals: number = 2): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount)
  }
}