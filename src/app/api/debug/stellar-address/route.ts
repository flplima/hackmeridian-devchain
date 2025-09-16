import { NextRequest, NextResponse } from "next/server"
import { Horizon } from "@stellar/stellar-sdk"

const server = new Horizon.Server("https://horizon-testnet.stellar.org")

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 }
      )
    }

    console.log(`🔍 Checking address: ${address}`)

    // Get account info
    let accountExists = false
    let accountInfo = null
    try {
      accountInfo = await server.loadAccount(address)
      accountExists = true
    } catch {
      console.log(`Account ${address} does not exist`)
    }

    // Get recent payments
    let payments: unknown[] = []
    try {
      const paymentsResponse = await server.payments()
        .forAccount(address)
        .order('desc')
        .limit(10)
        .call()

      payments = paymentsResponse.records.map(payment => ({
        transaction_hash: payment.transaction_hash,
        type: payment.type,
        from: payment.from,
        to: payment.to,
        amount: payment.amount,
        created_at: payment.created_at
      }))
    } catch (error) {
      console.error("Error fetching payments:", error)
    }

    // Get transaction details for each payment
    const transactionDetails = []
    for (const payment of payments.slice(0, 5)) {
      try {
        const transaction = await server.transactions()
          .transaction(payment.transaction_hash)
          .call()

        transactionDetails.push({
          hash: payment.transaction_hash,
          memo: transaction.memo,
          memo_type: transaction.memo_type,
          successful: transaction.successful,
          created_at: payment.created_at,
          payment_details: payment
        })
      } catch (error) {
        console.error(`Error fetching transaction ${payment.transaction_hash}:`, error)
      }
    }

    return NextResponse.json({
      address,
      accountExists,
      balance: accountExists ? accountInfo.balances : [],
      recentPayments: payments,
      transactionDetails
    })
  } catch (error) {
    console.error("Error in debug endpoint:", error)
    return NextResponse.json(
      { error: "Failed to check address" },
      { status: 500 }
    )
  }
}