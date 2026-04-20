import { createClient } from '@/utils/supabase/server'
import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance()

export type DailyAssetPoint = {
  date: string
  [account: string]: number | string
}

export async function getDailyAssetHistory() {
  const supabase = await createClient()

  const { data: trades, error } = await supabase
    .from('trades')
    .select('*')
    .order('trade_date', { ascending: true })

  if (error || !trades || trades.length === 0) {
    return { data: [], accounts: [] }
  }

  // 1. Determine date range
  const earliestStr = trades[0].trade_date
  let startDate = new Date(earliestStr)
  startDate.setDate(startDate.getDate() - 5) // Fetch a few days earlier to guarantee initial prices for weekends
  const endDate = new Date()

  // 2. Tickers & Accounts
  const tickers = Array.from(new Set(trades.map(t => t.ticker)))
  const accounts = Array.from(new Set(trades.map(t => t.account || 'Default')))
  const needsUsd = trades.some(t => t.currency === 'USD')

  // 3. Fetch historical data in parallel
  const historicalData: Record<string, Record<string, number>> = {}
  
  const fetchPromises = tickers.map(async (ticker) => {
    historicalData[ticker] = {}
    let fetchedFromYahoo = false;
    try {
      const result = await yahooFinance.chart(ticker, { period1: startDate, period2: endDate, interval: '1d' })
      const data = result.quotes
      if (data && data.length > 0) {
        for (const row of data) {
          if (row.date && row.close) {
            const dStr = row.date.toISOString().split('T')[0]
            historicalData[ticker][dStr] = row.close
          }
        }
        fetchedFromYahoo = true;
      }
    } catch(e) {
      console.warn(`Failed to fetch history for ${ticker} from Yahoo. Trying fallback...`);
    }

    if (!fetchedFromYahoo) {
      const isKorean = ticker.endsWith('.KS') || ticker.endsWith('.KQ') || ticker.endsWith('.ks') || ticker.endsWith('.kq');
      if (isKorean) {
        const naverTicker = ticker.split('.')[0];
        const startStr = startDate.toISOString().split('T')[0].replace(/-/g, '');
        const endStr = endDate.toISOString().split('T')[0].replace(/-/g, '');
        try {
          const response = await fetch(`https://api.finance.naver.com/siseJson.naver?symbol=${naverTicker}&requestType=1&startTime=${startStr}&endTime=${endStr}&timeframe=day`);
          if (response.ok) {
            const text = await response.text();
            const rows = text.split('\n').map(line => line.trim()).filter(line => line.startsWith('["'));
            for (const rowStr of rows) {
              const match = rowStr.match(/\["(\d{8})",\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/);
              if (match) {
                const d = match[1];
                const close = parseFloat(match[5]);
                const formattedDate = `${d.substring(0,4)}-${d.substring(4,6)}-${d.substring(6,8)}`;
                historicalData[ticker][formattedDate] = close;
              }
            }
          }
        } catch(fallbackErr) {
          console.warn(`Fallback also failed for ${ticker}`, fallbackErr);
        }
      }
    }
  })

  // Benchmarks
  const benchmarkTickers = ['^KS11', '^GSPC']
  for (const ticker of benchmarkTickers) {
    fetchPromises.push((async () => {
      historicalData[ticker] = {}
      try {
        const result = await yahooFinance.chart(ticker, { period1: startDate, period2: endDate, interval: '1d' })
        const data = result.quotes
        for (const row of data) {
          if (row.date && row.close) {
            const dStr = row.date.toISOString().split('T')[0]
            historicalData[ticker][dStr] = row.close
          }
        }
      } catch(e) {
        console.warn(`Failed to fetch history for benchmark ${ticker}`, e)
      }
    })())
  }

  historicalData['USDKRW'] = {}
  if (needsUsd) {
    fetchPromises.push((async () => {
      try {
        const result = await yahooFinance.chart('KRW=X', { period1: startDate, period2: endDate, interval: '1d' })
        const data = result.quotes
        for (const row of data) {
          if (row.date && row.close) {
            const dStr = row.date.toISOString().split('T')[0]
            historicalData['USDKRW'][dStr] = row.close
          }
        }
      } catch(e) {
        console.warn(`Failed to fetch FX`, e)
      }
    })())
  }

  await Promise.all(fetchPromises)

  // 4. Generate all dates from earliest trade to today
  const dailyPath: DailyAssetPoint[] = []
  const tickerFirstDates: Record<string, string> = {}
  
  // Keep track of quantities per account per ticker and cash map
  const holdings: Record<string, Record<string, number>> = {}
  const totalCostMap: Record<string, Record<string, number>> = {}
  const cash: Record<string, Record<string, number>> = {}
  for (const acc of accounts) {
    holdings[acc] = {}
    totalCostMap[acc] = {}
    cash[acc] = { KRW: 0, USD: 0 }
  }

  // Current iteration state
  let currentFx = 1350 // fallback fx
  const lastKnownPrice: Record<string, number> = {}
  const lastKnownAvgCost: Record<string, number> = {}
  let tradeIdx = 0

  // TWR and MWR State tracking
  const prevValue: Record<string, number> = {}
  const cumulativeTWR: Record<string, number> = {}
  
  const cumulativeNetDepositsKRW: Record<string, number> = {}
  const cumulativeNetDepositsUSD: Record<string, number> = {}

  for (const acc of accounts) {
    prevValue[acc] = 0
    cumulativeTWR[acc] = 1
    cumulativeNetDepositsKRW[acc] = 0
    cumulativeNetDepositsUSD[acc] = 0
  }
  let prevTotalValue = 0
  let cumulativeTotalTWR = 1
  let cumulativeTotalNetDepositsKRW = 0
  let cumulativeTotalNetDepositsUSD = 0

  let kospiBaseline: number | null = null
  let sp500Baseline: number | null = null

  const iterateDate = new Date(earliestStr)
  const endIterate = new Date()

  while (iterateDate <= endIterate) {
    const dateStr = iterateDate.toISOString().split('T')[0]

    const cashFlowsTodayKRW: Record<string, number> = {}
    const cashFlowsTodayUSD: Record<string, number> = {}
    for (const acc of accounts) {
      cashFlowsTodayKRW[acc] = 0
      cashFlowsTodayUSD[acc] = 0
    }
    let totalCashFlowTodayKRW = 0
    let totalCashFlowTodayUSD = 0

    // Process trades specifically on this date
    while (tradeIdx < trades.length && trades[tradeIdx].trade_date <= dateStr) {
      const t = trades[tradeIdx]
      const acc = t.account || 'Default'
      const cur = t.currency || 'KRW'
      const qty = parseFloat(t.quantity.toString())
      const price = parseFloat(t.price.toString())
      const fee = parseFloat(t.fee?.toString() || '0')
      const amount = qty * price

      if (!holdings[acc][t.ticker]) holdings[acc][t.ticker] = 0

      const isKrw = cur === 'KRW'

      if (t.type === 'DEPOSIT') {
        cash[acc][cur] += amount
        if (isKrw) {
          cashFlowsTodayKRW[acc] += amount
          totalCashFlowTodayKRW += amount
        } else {
          cashFlowsTodayUSD[acc] += amount
          totalCashFlowTodayUSD += amount
        }
      } else if (t.type === 'WITHDRAWAL') {
        cash[acc][cur] -= amount
        if (isKrw) {
          cashFlowsTodayKRW[acc] -= amount
          totalCashFlowTodayKRW -= amount
        } else {
          cashFlowsTodayUSD[acc] -= amount
          totalCashFlowTodayUSD -= amount
        }
      } else if (t.type === 'BUY') {
        if (!tickerFirstDates[t.ticker]) tickerFirstDates[t.ticker] = t.trade_date
        holdings[acc][t.ticker] += qty
        totalCostMap[acc][t.ticker] = (totalCostMap[acc][t.ticker] || 0) + amount
        cash[acc][cur] -= (amount + fee)
      } else if (t.type === 'SELL') {
        const curQty = holdings[acc][t.ticker] || 0
        const avgCost = curQty > 0 ? (totalCostMap[acc][t.ticker] || 0) / curQty : 0
        holdings[acc][t.ticker] -= qty
        totalCostMap[acc][t.ticker] = (totalCostMap[acc][t.ticker] || 0) - (qty * avgCost)
        cash[acc][cur] += (amount - fee)
      }

      // Avoid floating point inaccuracies close to 0
      if (Math.abs(holdings[acc][t.ticker]) < 1e-6) holdings[acc][t.ticker] = 0
      
      tradeIdx++
    }

    // Update daily prices and FX
    if (historicalData['USDKRW'] && historicalData['USDKRW'][dateStr]) {
      currentFx = historicalData['USDKRW'][dateStr]
    }
    
    // Also include benchmark tickers for price propagation
    const allTickersToTrack = [...tickers, ...benchmarkTickers]
    for (const ticker of allTickersToTrack) {
      if (historicalData[ticker] && historicalData[ticker][dateStr]) {
        lastKnownPrice[ticker] = historicalData[ticker][dateStr]
      }
    }

    // Compute value for each account
    const point: DailyAssetPoint = { date: dateStr }
    
    // Attach prices of all tracked tickers and benchmarks
    for (const ticker of allTickersToTrack) {
      if (lastKnownPrice[ticker] !== undefined) {
        point[`price_${ticker}`] = lastKnownPrice[ticker]
      }
    }

    // Attach avg_cost for all portfolio tickers based on current holdings
    for (const ticker of tickers) {
      let totalCostForTicker = 0;
      let totalQtyForTicker = 0;
      for (const acc of accounts) {
        totalCostForTicker += (totalCostMap[acc]?.[ticker] || 0);
        totalQtyForTicker += (holdings[acc]?.[ticker] || 0);
      }
      
      if (totalQtyForTicker > 1e-6) {
        const avgCost = totalCostForTicker / totalQtyForTicker;
        point[`avg_cost_${ticker}`] = avgCost;
        lastKnownAvgCost[ticker] = avgCost;
      } else if (lastKnownAvgCost[ticker] !== undefined) {
        point[`avg_cost_${ticker}`] = lastKnownAvgCost[ticker];
      }
    }

    let hasValue = false

    for (const acc of accounts) {
      let dailyValue = 0
      for (const [ticker, qty] of Object.entries(holdings[acc])) {
        if (qty > 0 && ticker !== 'CASH') {
          const price = lastKnownPrice[ticker] || 0
          // Assume ticker without .KS/.KQ is US stock
          const isKorean = ticker.endsWith('.KS') || ticker.endsWith('.KQ') || ticker.endsWith('.ks') || ticker.endsWith('.kq')
          const rate = isKorean ? 1 : currentFx
          dailyValue += (qty * price * rate)
        }
      }
      
      // Add Cash 
      dailyValue += cash[acc].KRW
      dailyValue += cash[acc].USD * currentFx

      point[acc] = dailyValue
      if (dailyValue > 0) {
        hasValue = true
      }
    }

    // Compute total assets across all accounts
    let totalValue = 0
    for (const acc of accounts) {
      totalValue += (point[acc] as number)
    }
    point['Total'] = totalValue

    // Calculate True TWR and MWR for Accounts
    for (const acc of accounts) {
      const vCurrent = point[acc] as number
      const vPrev = prevValue[acc]
      // cf evaluates today's cashflow at today's fx (for TWR rebasing)
      const cf = cashFlowsTodayKRW[acc] + (cashFlowsTodayUSD[acc] * currentFx)
      
      let dailyReturn = 0
      if (vPrev > 0) {
        dailyReturn = (vCurrent - cf) / vPrev - 1
      }
      cumulativeTWR[acc] = cumulativeTWR[acc] * (1 + dailyReturn)
      
      point[`return_${acc}`] = (cumulativeTWR[acc] - 1) * 100
      prevValue[acc] = vCurrent

      // MWR Calculation - base principal incorporates fx dynamically
      if (cf > 0) {
        cumulativeNetDepositsKRW[acc] += cashFlowsTodayKRW[acc]
        cumulativeNetDepositsUSD[acc] += cashFlowsTodayUSD[acc]
      } else if (cf < 0) {
        if (vPrev > 0) {
          const ratio = Math.min(1, Math.abs(cf) / vPrev)
          cumulativeNetDepositsKRW[acc] *= (1 - ratio)
          cumulativeNetDepositsUSD[acc] *= (1 - ratio)
        } else {
          cumulativeNetDepositsKRW[acc] += cashFlowsTodayKRW[acc]
          cumulativeNetDepositsUSD[acc] += cashFlowsTodayUSD[acc]
        }
      }

      const currentNetDeposits = cumulativeNetDepositsKRW[acc] + (cumulativeNetDepositsUSD[acc] * currentFx)

      if (currentNetDeposits > 0) {
        point[`mwr_${acc}`] = (vCurrent / currentNetDeposits - 1) * 100
      } else {
        point[`mwr_${acc}`] = 0
      }
    }
    
    // Total True TWR and MWR
    const totalCashFlowToday = totalCashFlowTodayKRW + (totalCashFlowTodayUSD * currentFx)
    let dailyTotalReturn = 0
    if (prevTotalValue > 0) {
      dailyTotalReturn = (totalValue - totalCashFlowToday) / prevTotalValue - 1
    }
    cumulativeTotalTWR = cumulativeTotalTWR * (1 + dailyTotalReturn)
    point['return_Total'] = (cumulativeTotalTWR - 1) * 100
    prevTotalValue = totalValue

    if (totalCashFlowToday > 0) {
      cumulativeTotalNetDepositsKRW += totalCashFlowTodayKRW
      cumulativeTotalNetDepositsUSD += totalCashFlowTodayUSD
    } else if (totalCashFlowToday < 0) {
      if (prevTotalValue > 0) {
        const ratio = Math.min(1, Math.abs(totalCashFlowToday) / prevTotalValue)
        cumulativeTotalNetDepositsKRW *= (1 - ratio)
        cumulativeTotalNetDepositsUSD *= (1 - ratio)
      } else {
        cumulativeTotalNetDepositsKRW += totalCashFlowTodayKRW
        cumulativeTotalNetDepositsUSD += totalCashFlowTodayUSD
      }
    }

    const currentTotalNetDeposits = cumulativeTotalNetDepositsKRW + (cumulativeTotalNetDepositsUSD * currentFx)

    if (currentTotalNetDeposits > 0) {
      point['mwr_Total'] = (totalValue / currentTotalNetDeposits - 1) * 100
    } else {
      point['mwr_Total'] = 0
    }

    // Calculate Benchmark TWRs
    const currentKospi = lastKnownPrice['^KS11']
    if (currentKospi) {
      if (kospiBaseline === null) kospiBaseline = currentKospi
      point['return_KOSPI'] = (currentKospi / kospiBaseline - 1) * 100
    }

    const currentSp500 = lastKnownPrice['^GSPC']
    if (currentSp500) {
      if (sp500Baseline === null) sp500Baseline = currentSp500
      point['return_SP500'] = (currentSp500 / sp500Baseline - 1) * 100
    }

    // Only add if there is at least some value to display to avoid leading zero charts
    if (hasValue || dailyPath.length > 0) {
        dailyPath.push(point)
    }

    iterateDate.setDate(iterateDate.getDate() + 1)
  }

  return {
    data: dailyPath,
    accounts,
    tickerFirstDates
  }
}
