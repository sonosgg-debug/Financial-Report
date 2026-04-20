import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance({ validation: { logErrors: false } })

async function fetchFromNaverFinance(ticker: string) {
  try {
    const isKorean = ticker.endsWith('.KS') || ticker.endsWith('.KQ');
    if (isKorean) {
      const naverTicker = ticker.split('.')[0];
      const response = await fetch(`https://m.stock.naver.com/api/stock/${naverTicker}/basic`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.closePrice) {
          return {
            price: parseFloat(data.closePrice.replace(/,/g, '')),
            currency: 'KRW',
            shortName: data.stockName,
          };
        }
      }
    } else {
      const suffixes = ['.O', '.N', '.A', ''];
      for (const suffix of suffixes) {
        const response = await fetch(`https://api.stock.naver.com/stock/${ticker}${suffix}/basic`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.stockEndType === 'stock' && data.closePrice) {
            return {
              price: parseFloat(data.closePrice.replace(/,/g, '')),
              currency: 'USD',
              shortName: data.stockName || data.stockNameEng,
            };
          }
        }
      }
    }
  } catch (error) {
    console.error('Naver Finance API Fallback Error:', error);
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  let decodedTicker = '';
  try {
    const { ticker } = await params
    decodedTicker = decodeURIComponent(ticker)

    const quote = await yahooFinance.quote(decodedTicker)
    const currentPrice = (quote as any).regularMarketPrice

    if (!currentPrice) {
      throw new Error('Price not found in Yahoo Finance.');
    }

    return NextResponse.json({
      ticker: decodedTicker,
      price: currentPrice,
      currency: quote.currency,
      shortName: quote.shortName,
    })
  } catch (error: any) {
    console.warn(`Yahoo Finance failed for ${decodedTicker}: ${error.message}. Attempting fallback to Naver Finance...`);
    
    if (decodedTicker) {
      const fallbackData = await fetchFromNaverFinance(decodedTicker);
      if (fallbackData) {
         console.log(`Fallback successful for ${decodedTicker} via Naver Finance.`);
         return NextResponse.json({
           ticker: decodedTicker,
           price: fallbackData.price,
           currency: fallbackData.currency,
           shortName: fallbackData.shortName,
         });
      }
    }

    console.error('Both Yahoo and Naver Finance API failed for:', decodedTicker)
    return NextResponse.json(
      { error: 'Failed to fetch stock data.' },
      { status: 500 }
    )
  }
}
