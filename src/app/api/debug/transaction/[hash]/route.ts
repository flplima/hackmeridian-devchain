import { NextRequest, NextResponse } from "next/server"
import { Horizon } from "@stellar/stellar-sdk"

const server = new Horizon.Server("https://horizon-testnet.stellar.org")

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params

    console.log(`🔍 DEBUG: Analyzing transaction ${hash}`)

    // Get transaction details
    const transaction = await server.transactions()
      .transaction(hash)
      .call()

    // Get the transaction effects to find data entries
    const effects = await server.effects()
      .forTransaction(hash)
      .call()

    console.log(`📋 DEBUG: Found ${effects.records.length} effects`)

    const dataEntries: any[] = []
    const otherEffects: any[] = []

    // Analyze all effects
    for (const effect of effects.records) {
      console.log(`🔍 Effect type: ${effect.type}`)

      if (effect.type === 'data_created' || effect.type === 'data_updated') {
        const dataEffect = effect as any
        console.log(`📊 Data entry found - Name: ${dataEffect.name}`)

        try {
          const decodedValue = Buffer.from(dataEffect.value, 'base64').toString('utf8')
          console.log(`📊 Decoded value: ${decodedValue}`)

          dataEntries.push({
            name: dataEffect.name,
            value: dataEffect.value,
            decodedValue: decodedValue
          })
        } catch (e) {
          console.log(`❌ Error decoding data entry: ${e}`)
          dataEntries.push({
            name: dataEffect.name,
            value: dataEffect.value,
            decodedValue: 'ERROR: Could not decode'
          })
        }
      } else {
        otherEffects.push({
          type: effect.type,
          data: effect
        })
      }
    }

    return NextResponse.json({
      transaction: {
        hash: transaction.hash,
        memo: transaction.memo,
        memo_type: transaction.memo_type,
        created_at: transaction.created_at,
        successful: transaction.successful
      },
      dataEntries,
      otherEffects,
      debug: {
        totalEffects: effects.records.length,
        dataEntriesFound: dataEntries.length,
        otherEffectsFound: otherEffects.length
      }
    })
  } catch (error) {
    console.error("Error analyzing transaction:", error)
    return NextResponse.json(
      { error: "Failed to analyze transaction", details: error.message },
      { status: 500 }
    )
  }
}