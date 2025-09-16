import { NextRequest, NextResponse } from "next/server"
import { UserAddressService } from "@/lib/user-address-service"
import { StellarBalanceService } from "@/lib/stellar-balance-service"
import { StellarPriceService } from "@/lib/stellar-price-service"

// Get Stellar account balance from blockchain
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      )
    }

    // Get the user's Stellar address
    const stellarAddress = await UserAddressService.getStellarAddressByUserId(
      userId,
      process.env.MASTER_TOKEN
    )

    if (!stellarAddress) {
      return NextResponse.json(
        { error: "Failed to get Stellar address for user" },
        { status: 500 }
      )
    }

    console.log(`Fetching balance for: ${stellarAddress}`)

    // Get account info from Stellar blockchain
    const accountInfo = await StellarBalanceService.getAccountInfo(stellarAddress)

    if (!accountInfo) {
      return NextResponse.json(
        { error: "Failed to fetch account information" },
        { status: 500 }
      )
    }

    // Get XLM balance specifically
    const xlmBalance = await StellarBalanceService.getXLMBalance(stellarAddress)

    // Convert to USD
    const xlmBalanceUSD = await StellarPriceService.xlmToUSD(xlmBalance)
    const xlmPriceUSD = await StellarPriceService.getXLMPriceUSD()

    return NextResponse.json({
      stellarAddress,
      xlmBalance,
      xlmBalanceUSD,
      xlmPriceUSD,
      accountExists: accountInfo.exists,
      balances: accountInfo.balances,
      sequence: accountInfo.sequence,
      explorerUrl: `https://stellar.expert/explorer/testnet/account/${stellarAddress}`,
      fundingInfo: accountInfo.exists ? null : StellarBalanceService.getTestnetFundingInfo(stellarAddress)
    })

  } catch (error) {
    console.error("Error fetching balance:", error)
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    )
  }
}