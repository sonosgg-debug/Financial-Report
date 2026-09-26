import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
import { getStockDisplayName, normalizeTicker } from '@/utils/stockSearch'

const yahooFinance = new YahooFinance({ validation: { logErrors: false } })

function isKoreanTicker(ticker: string): boolean {
  return ticker.endsWith('.KS') || ticker.endsWith('.KQ') || /^\d{6}$/.test(ticker)
}

async function fetchFromNaverFinance(ticker: string) {
  try {
    const isKorean = isKoreanTicker(ticker)
    if (isKorean) {
      const naverTicker = ticker.split('.')[0]
      const response = await fetch(`https://m.stock.naver.com/api/stock/${naverTicker}/basic`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
      })
      if (response.ok) {
        const data = await response.json()
        if (data && data.closePrice) {
          return {
            price: parseFloat(data.closePrice.replace(/,/g, '')),
            currency: 'KRW',
            shortName: data.stockName,
          }
        }
      }
    } else {
      const suffixes = ['.O', '.N', '.A', '']
      for (const suffix of suffixes) {
        const response = await fetch(`https://api.stock.naver.com/stock/${ticker}${suffix}/basic`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        })
        if (response.ok) {
          const data = await response.json()
          if (data && data.stockEndType === 'stock' && data.closePrice) {
            return {
              price: parseFloat(data.closePrice.replace(/,/g, '')),
              currency: 'USD',
              shortName: data.stockName || data.stockNameEng,
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Naver Finance API Error:', error)
  }
  return null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  let decodedTicker = ''
  try {
    const { ticker } = await params
    decodedTicker = decodeURIComponent(ticker)
    const targetTicker = normalizeTicker(decodedTicker)
    const isKorean = isKoreanTicker(targetTicker)

    // 한국 주식은 네이버 증권 API가 실시간 공식 시세이므로 1순위 조회 (yfinance 왜곡 및 딜레이 방지)
    if (isKorean) {
      const naverData = await fetchFromNaverFinance(targetTicker)
      if (naverData && naverData.price) {
        const localName = getStockDisplayName(targetTicker)
        const shortName = localName !== targetTicker ? localName : (naverData.shortName || targetTicker)
        return NextResponse.json({
          ticker: targetTicker,
          price: naverData.price,
          currency: naverData.currency,
          shortName,
        })
      }
      console.warn(`Naver Finance failed for Korean stock ${targetTicker}. Falling back to Yahoo Finance...`)
    }

    // 해외 주식 1순위 또는 한국 주식 네이버 실패 시 Yahoo Finance 조회
    try {
      const quote = await yahooFinance.quote(targetTicker)
      const currentPrice = (quote as any).regularMarketPrice

      if (currentPrice) {
        const localName = getStockDisplayName(targetTicker)
        const shortName = localName !== targetTicker ? localName : (quote.shortName || targetTicker)
        return NextResponse.json({
          ticker: targetTicker,
          price: currentPrice,
          currency: quote.currency,
          shortName,
        })
      }
    } catch (yahooErr: any) {
      console.warn(`Yahoo Finance failed for ${targetTicker}: ${yahooErr.message}`)
    }

    // 해외 주식의 경우 Yahoo Finance 실패 시 Naver Finance 해외 시세로 최종 폴백
    if (!isKorean) {
      const fallbackData = await fetchFromNaverFinance(targetTicker)
      if (fallbackData && fallbackData.price) {
        console.log(`Fallback successful for ${targetTicker} via Naver Finance.`)
        const localName = getStockDisplayName(targetTicker)
        const shortName = localName !== targetTicker ? localName : (fallbackData.shortName || targetTicker)
        return NextResponse.json({
          ticker: targetTicker,
          price: fallbackData.price,
          currency: fallbackData.currency,
          shortName,
        })
      }
    }

    console.error('All price APIs failed for:', decodedTicker)
    return NextResponse.json(
      { error: 'Failed to fetch stock data.' },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('Stock price route unhandled error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    )
  }
}
