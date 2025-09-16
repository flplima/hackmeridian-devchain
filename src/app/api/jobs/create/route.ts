import { serverDataStore } from "@/lib/server-data-store"
import { Escrow, EscrowState } from "@/lib/server-data-store"
import { UserAddressService } from "@/lib/user-address-service"
import { StellarBalanceService } from "@/lib/stellar-balance-service"
import { StellarPriceService } from "@/lib/stellar-price-service"
import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Job creation request body:", JSON.stringify(body, null, 2))

    const {
      title,
      description,
      amount, // This is now XLM amount
      usdAmount, // Original USD amount for display
      tags,
      requirements,
      employerId, // Organization user ID
      createEscrow = true,
      deadline
    } = body

    console.log("Validation checks:", {
      title: !!title,
      description: !!description,
      amount: !!amount,
      createEscrow,
      employerId: !!employerId
    })

    if (!title || !description || !amount) {
      console.log("Missing required fields:", { title, description, amount })
      return NextResponse.json(
        { error: "Missing required fields: title, description, amount" },
        { status: 400 }
      )
    }

    if (createEscrow && !employerId) {
      console.log("Missing employerId for escrow creation")
      return NextResponse.json(
        { error: "employerId is required when creating escrow" },
        { status: 400 }
      )
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const jobData = {
      id: jobId,
      title,
      description,
      amount, // XLM amount
      usdAmount: usdAmount || null, // USD amount for display
      tags: tags || [],
      requirements: requirements || [],
      employerId: employerId || null, // Store the organization user ID
      employerName: "Test Employer", // TODO: Get from employer profile
      employerImage: "/default-org.png",
      createdAt: new Date().toISOString(),
      status: "open",
    }

    let escrow = null

    if (createEscrow && employerId) {
      // Get or create employer's Stellar address using the service
      const employerStellarAddress = await UserAddressService.getStellarAddressByUserId(
        employerId,
        process.env.MASTER_TOKEN
      )

      if (!employerStellarAddress) {
        return NextResponse.json(
          { error: "Failed to create Stellar address for employer. Please try again." },
          { status: 500 }
        )
      }

      // Convert amount to stroops (1 XLM = 10,000,000 stroops)
      const stellarAmount = Math.round(parseFloat(amount) * 10000000).toString()

      // Check if employer has sufficient balance before creating escrow
      const hasSufficientBalance = await StellarBalanceService.hasSufficientBalance(
        employerStellarAddress,
        amount
      )

      if (!hasSufficientBalance) {
        const currentBalance = await StellarBalanceService.getXLMBalance(employerStellarAddress)
        const currentBalanceUSD = await StellarPriceService.xlmToUSD(currentBalance)
        const requiredAmountUSD = usdAmount ? parseFloat(usdAmount) : await StellarPriceService.xlmToUSD(amount)

        return NextResponse.json(
          {
            error: "Insufficient XLM balance",
            currentBalance: StellarPriceService.formatXLM(parseFloat(currentBalance)),
            currentBalanceUSD: StellarPriceService.formatUSD(currentBalanceUSD),
            requiredAmount: StellarPriceService.formatXLM(parseFloat(amount)),
            requiredAmountUSD: StellarPriceService.formatUSD(requiredAmountUSD),
            stellarAddress: employerStellarAddress,
            fundingInfo: StellarBalanceService.getTestnetFundingInfo(employerStellarAddress)
          },
          { status: 400 }
        )
      }

      // Create escrow (automatically funded for hackathon demo)
      escrow = {
        id: uuidv4(),
        jobId,
        payerAddress: employerStellarAddress,
        tokenAddress: "XLM",
        amount: stellarAmount,
        state: EscrowState.FUNDED, // Automatically fund the escrow for demo purposes
        createdAt: new Date().toISOString(),
        deadline: deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days default
        transactionHash: `mock_funding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Mock funding transaction
      }

      await serverDataStore.addEscrow(escrow)

      console.log(`✅ Escrow ${escrow.id} automatically funded with ${amount} XLM (${stellarAmount} stroops)`)
      console.log(`📄 Mock funding transaction: ${escrow.transactionHash}`)

      // Update job with escrow info
      jobData.escrowId = escrow.id
      jobData.stellarAmount = stellarAmount
    }

    await serverDataStore.addJob(jobData)

    return NextResponse.json({
      job: jobData,
      escrow,
      message: createEscrow ? "Job and escrow created successfully" : "Job created successfully"
    })

  } catch (error) {
    console.error("Error creating job:", error)
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    )
  }
}
