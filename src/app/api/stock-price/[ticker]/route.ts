import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params
    const decodedTicker = decodeURIComponent(ticker)

    const quote = await yahooFinance.quote(decodedTicker)
    const currentPrice = (quote as any).regularMarketPrice

    if (!currentPrice) {
      return NextResponse.json(
        { error: 'Price not found for the given ticker.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ticker: decodedTicker,
      price: currentPrice,
      currency: quote.currency,
      shortName: quote.shortName,
    })
  } catch (error: any) {
    console.error('Yahoo Finance API Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch stock data.' },
      { status: 500 }
    )
  }
}
