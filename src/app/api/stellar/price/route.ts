import { NextResponse } from "next/server"
import { StellarPriceService } from "@/lib/stellar-price-service"

// Get current XLM price in USD
export async function GET() {
  try {
    const priceUSD = await StellarPriceService.getXLMPriceUSD()

    return NextResponse.json({
      xlm_usd: priceUSD,
      last_updated: new Date().toISOString(),
      source: "CoinGecko API"
    })

  } catch (error) {
    console.error("Error fetching XLM price:", error)
    return NextResponse.json(
      { error: "Failed to fetch XLM price" },
      { status: 500 }
    )
  }
}