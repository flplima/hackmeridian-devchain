import { NextRequest, NextResponse } from "next/server"
import { UserAddressService } from "@/lib/user-address-service"

// Fund a testnet account using Stellar's Friendbot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

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

    console.log(`Funding testnet account: ${stellarAddress}`)

    // Call Stellar Friendbot to fund the account
    const friendbotUrl = `https://friendbot.stellar.org?addr=${stellarAddress}`

    const response = await fetch(friendbotUrl, {
      method: 'GET',
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Friendbot error:', response.status, errorText)

      return NextResponse.json(
        {
          error: "Failed to fund account via Friendbot",
          details: errorText,
          stellarAddress
        },
        { status: 500 }
      )
    }

    const result = await response.json()
    console.log('Friendbot success:', result)

    return NextResponse.json({
      success: true,
      stellarAddress,
      transactionHash: result.hash,
      message: "Account funded successfully with 10,000 XLM testnet tokens",
      explorerUrl: `https://stellar.expert/explorer/testnet/account/${stellarAddress}`
    })

  } catch (error) {
    console.error("Error funding account:", error)
    return NextResponse.json(
      { error: "Failed to fund account" },
      { status: 500 }
    )
  }
}