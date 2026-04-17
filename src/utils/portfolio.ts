import { createClient } from '@/utils/supabase/server'
import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance()

async function getKoreanName(ticker: string): Promise<string | null> {
  const match = ticker.match(/^(\d{6})/);
  if (!match) return null;
  const code = match[1];

  try {
    const res = await fetch(`https://finance.naver.com/item/main.naver?code=${code}`, {
      next: { revalidate: 86400 } // 24 hours cache
    });
    if (!res.ok) return null;
    const html = await res.text();
    
    const titleMatch = html.match(/<title>(.*?)(?: : 네| : N| - )/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }
  } catch(e) {
    console.error(`Failed to fetch Korean name for ${code}`, e);
  }
  return null;
}

export type Holding = {
  ticker: string
  name: string
  sector: string
  account: string
  currency: string
  quantity: number
  totalCost: number
  averageCost: number
  currentPrice: number
  currentValue: number
  currentValueKrw: number
  unrealizedReturn: number
  unrealizedReturnPct: number
}

export async function getPortfolio() {
  const supabase = await createClient()

  // Fetch trades
  const { data: trades, error } = await supabase
    .from('trades')
    .select('*')
    .order('trade_date', { ascending: true })

  if (error || !trades) {
    console.error('Error fetching trades', error)
    return { holdings: [], totalValue: 0, totalCost: 0 }
  }

  // Fetch USD/KRW exchange rate just in case we have USD trades.
  let usdKrwRate = 1350 // Fallback
  try {
    const fx = await yahooFinance.quote('KRW=X')
    if (fx && fx.regularMarketPrice) {
      usdKrwRate = fx.regularMarketPrice
    }
  } catch (e) {
    console.error('Failed to fetch FX rate', e)
  }

  // Calculate holdings and cash
  const holdingsMap = new Map<string, { quantity: number; totalCost: number; currency: string; sector: string; account: string }>()
  const cashMap = new Map<string, { KRW: number, USD: number }>()

  for (const trade of trades) {
    const { ticker, type, quantity, price, currency, sector, account, fee } = trade
    const acc = account || 'Default'
    const cur = currency || 'KRW'
    
    // Manage Cash Balance
    if (!cashMap.has(acc)) cashMap.set(acc, { KRW: 0, USD: 0 })
    const cash = cashMap.get(acc)!
    const amount = Number(quantity) * Number(price)
    const tradeFee = Number(fee || 0)

    if (type === 'DEPOSIT') {
      cash[cur as 'KRW' | 'USD'] += amount
      continue
    } else if (type === 'WITHDRAWAL') {
      cash[cur as 'KRW' | 'USD'] -= amount
      continue
    } else if (type === 'BUY') {
      cash[cur as 'KRW' | 'USD'] -= (amount + tradeFee)
    } else if (type === 'SELL') {
      cash[cur as 'KRW' | 'USD'] += (amount - tradeFee)
    }

    // Now proceed with stock holding map...
    const key = `${ticker}_${acc}`
    const current = holdingsMap.get(key) || { quantity: 0, totalCost: 0, currency: cur, sector: sector || 'Uncategorized', account: acc }
    
    if (sector && sector !== 'Uncategorized') {
      current.sector = sector
    }
    
    if (type === 'BUY') {
      current.quantity += Number(quantity)
      current.totalCost += amount
    } else if (type === 'SELL') {
      // Approximate avg cost reduction
      const avgCost = current.quantity > 0 ? current.totalCost / current.quantity : 0
      current.quantity -= Number(quantity)
      current.totalCost -= Number(quantity) * avgCost
    }

    if (current.quantity > 0) {
      holdingsMap.set(key, current)
    } else {
      holdingsMap.delete(key)
    }
  }

  // Fetch current prices
  const holdings: Holding[] = []
  let totalValue = 0
  let aggregateCost = 0

  for (const [key, data] of holdingsMap.entries()) {
    // extract ticker from key (in case of something like 005930.KS_Default, we just want 005930.KS)
    const ticker = key.substring(0, key.lastIndexOf('_'))
    try {
      const quote = await yahooFinance.quote(ticker).catch(() => null)
      if (!quote || !quote.regularMarketPrice) {
        throw new Error(`Quote not found or missing price for ${ticker}`)
      }
      
      const currentPrice = quote.regularMarketPrice
      const currentValue = data.quantity * currentPrice
      const averageCost = data.totalCost / data.quantity
      const unrealizedReturn = currentValue - data.totalCost
      const unrealizedReturnPct = data.totalCost > 0 ? (unrealizedReturn / data.totalCost) * 100 : 0

      const isKorean = ticker.endsWith('.KS') || ticker.endsWith('.KQ') || ticker.endsWith('.ks') || ticker.endsWith('.kq');
      let displayName = quote.shortName || quote.longName || ticker;
      
      if (isKorean) {
        const koName = await getKoreanName(ticker);
        if (koName) {
          displayName = koName;
        }
      }

      const rate = data.currency === 'USD' ? usdKrwRate : 1

      holdings.push({
        ticker,
        name: displayName,
        sector: data.sector,
        account: data.account,
        currency: data.currency,
        quantity: data.quantity,
        totalCost: data.totalCost,
        averageCost,
        currentPrice,
        currentValue,
        currentValueKrw: currentValue * rate,
        unrealizedReturn,
        unrealizedReturnPct
      })

      // Convert USD to KRW for the aggregate totals
      totalValue += (currentValue * rate)
      aggregateCost += (data.totalCost * rate)
    } catch (e) {
      console.warn(`Failed to fetch current price for ${ticker}: ${e instanceof Error ? e.message : 'Unknown error'}`)
      // fallback to average cost if price not found
      const currentPrice = data.totalCost / data.quantity
      const currentValue = data.quantity * currentPrice
      const rate = data.currency === 'USD' ? usdKrwRate : 1

      const isKorean = ticker.endsWith('.KS') || ticker.endsWith('.KQ') || ticker.endsWith('.ks') || ticker.endsWith('.kq');
      let displayName = ticker;
      
      if (isKorean) {
        const koName = await getKoreanName(ticker);
        if (koName) {
          displayName = koName;
        }
      }

      holdings.push({
        ticker,
        name: displayName,
        sector: data.sector,
        account: data.account,
        currency: data.currency,
        quantity: data.quantity,
        totalCost: data.totalCost,
        averageCost: currentPrice,
        currentPrice,
        currentValue,
        currentValueKrw: currentValue * rate,
        unrealizedReturn: 0,
        unrealizedReturnPct: 0
      })
      totalValue += (currentValue * rate)
      aggregateCost += (data.totalCost * rate)
    }
  }

  // Add accumulated cash to holdings
  for (const [acc, cash] of cashMap.entries()) {
    if (cash.KRW !== 0) {
      holdings.push({
        ticker: 'CASH',
        name: 'Korean Won (현금)',
        sector: 'Cash',
        account: acc,
        currency: 'KRW',
        quantity: cash.KRW,
        totalCost: cash.KRW,
        averageCost: 1,
        currentPrice: 1,
        currentValue: cash.KRW,
        currentValueKrw: cash.KRW,
        unrealizedReturn: 0,
        unrealizedReturnPct: 0
      })
      totalValue += cash.KRW
      aggregateCost += cash.KRW
    }
    if (cash.USD !== 0) {
      const krwValue = cash.USD * usdKrwRate
      holdings.push({
        ticker: 'CASH_USD',
        name: 'US Dollar (달러 현금)',
        sector: 'Cash',
        account: acc,
        currency: 'USD',
        quantity: cash.USD,
        totalCost: cash.USD, // We treat 1 USD cost as 1 USD. Not trying to complicate FX PnL yet.
        averageCost: 1,
        currentPrice: 1,
        currentValue: cash.USD,
        currentValueKrw: krwValue,
        unrealizedReturn: 0,
        unrealizedReturnPct: 0
      })
      totalValue += krwValue
      aggregateCost += krwValue
    }
  }

  return { holdings, totalValue, totalCost: aggregateCost }
}
