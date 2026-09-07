import stocksData from '@/data/stocks.json'

export interface StockItem {
  code: string
  name: string
  market: string
  ticker: string
  currency: 'KRW' | 'USD'
  enName?: string
}

interface StockItemInternal extends StockItem {
  chosung: string
  isPopular?: boolean
}

const CHOSUNG_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

export function getChosung(str: string): string {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 0xac00
    if (code >= 0 && code <= 11171) {
      result += CHOSUNG_LIST[Math.floor(code / (21 * 28))]
    } else {
      result += str.charAt(i).toLowerCase()
    }
  }
  return result
}

// Major popular tickers to prioritize in search results
const POPULAR_TICKERS = new Set([
  '005930.KS', // 삼성전자
  '000660.KS', // SK하이닉스
  '005380.KS', // 현대차
  '373220.KS', // LG에너지솔루션
  '207940.KS', // 삼성바이오로직스
  '000270.KS', // 기아
  '068270.KS', // 셀트리온
  '035420.KS', // NAVER
  '035720.KS', // 카카오
  '247540.KQ', // 에코프로비엠
  '086520.KQ', // 에코프로
  'AAPL',      // 애플
  'NVDA',      // 엔비디아
  'TSLA',      // 테슬라
  'MSFT',      // 마이크로소프트
  'AMZN',      // 아마존
  'GOOGL',     // 구글
  'META',      // 메타
  'PLTR',      // 팔란티어
  'IONQ',      // 아이온큐
  'SOXL',      // SOXL
  'TQQQ',      // TQQQ
  'QQQ',       // QQQ
  'SPY',       // SPY
  'SCHD',      // SCHD
])

const STOCKS: StockItemInternal[] = (stocksData as StockItem[]).map(stock => ({
  ...stock,
  chosung: getChosung(stock.name),
  isPopular: POPULAR_TICKERS.has(stock.ticker.toUpperCase())
}))

// Lookup maps for fast access
const codeMap = new Map<string, StockItemInternal>()
const nameMap = new Map<string, StockItemInternal>()
const tickerMap = new Map<string, StockItemInternal>()

for (const stock of STOCKS) {
  codeMap.set(stock.code.toUpperCase(), stock)
  nameMap.set(stock.name.toLowerCase().trim(), stock)
  tickerMap.set(stock.ticker.toUpperCase(), stock)
}

/**
 * Searches stocks by keyword (Korean name, English name, ticker, 6-digit code, or Korean Chosung).
 */
export function searchStocks(query: string, limit = 20): StockItem[] {
  const trimmed = query.trim()
  if (!trimmed) {
    // Return top popular stocks if query is empty
    return STOCKS.filter(s => s.isPopular).slice(0, limit)
  }

  const qLower = trimmed.toLowerCase()
  const qUpper = trimmed.toUpperCase()
  const isOnlyChosung = /^[ㄱ-ㅎ]+$/.test(trimmed)

  const exactMatches: StockItemInternal[] = []
  const startsWithMatches: StockItemInternal[] = []
  const containsMatches: StockItemInternal[] = []

  for (const stock of STOCKS) {
    const sName = stock.name.toLowerCase()
    const sCode = stock.code.toUpperCase()
    const sTicker = stock.ticker.toUpperCase()
    const sEn = stock.enName?.toLowerCase() || ''
    const sChosung = stock.chosung

    // Exact matches
    if (sCode === qUpper || sTicker === qUpper || sName === qLower || sEn === qLower) {
      exactMatches.push(stock)
      continue
    }

    // Chosung matching
    if (isOnlyChosung && sChosung.includes(trimmed)) {
      if (sChosung.startsWith(trimmed)) {
        startsWithMatches.push(stock)
      } else {
        containsMatches.push(stock)
      }
      continue
    }

    // Starts with
    if (sName.startsWith(qLower) || sCode.startsWith(qUpper) || sTicker.startsWith(qUpper) || sEn.startsWith(qLower)) {
      startsWithMatches.push(stock)
      continue
    }

    // Contains
    if (sName.includes(qLower) || sCode.includes(qUpper) || sTicker.includes(qUpper) || sEn.includes(qLower)) {
      containsMatches.push(stock)
    }
  }

  // Sort startsWith and contains by popular items first
  const sortByPopular = (a: StockItemInternal, b: StockItemInternal) => {
    if (a.isPopular && !b.isPopular) return -1
    if (!a.isPopular && b.isPopular) return 1
    return 0
  }

  exactMatches.sort(sortByPopular)
  startsWithMatches.sort(sortByPopular)
  containsMatches.sort(sortByPopular)

  const results = [...exactMatches, ...startsWithMatches, ...containsMatches]
  return results.slice(0, limit)
}

/**
 * Resolves any user-entered text (Korean name, "Name (Code)", 6-digit code, US ticker)
 * into a valid Yahoo/Naver ticker, human-readable name, and currency.
 */
export function resolveStockTicker(input: string): {
  ticker: string
  name: string
  currency: 'KRW' | 'USD'
  market?: string
} {
  const clean = input.trim()
  if (!clean || clean.toUpperCase() === 'CASH') {
    return { ticker: 'CASH', name: '현금', currency: 'KRW', market: 'Cash' }
  }

  // 1. Check format: "종목명 (코드/티커)"
  const parenMatch = clean.match(/^(.*?)\s*\(([^)]+)\)$/)
  if (parenMatch) {
    const namePart = parenMatch[1].trim()
    const codePart = parenMatch[2].trim()

    // If codePart is 6 digits
    if (/^\d{6}$/.test(codePart)) {
      const stock = codeMap.get(codePart)
      if (stock) {
        return {
          ticker: stock.ticker,
          name: stock.name,
          currency: stock.currency,
          market: stock.market
        }
      }
      return {
        ticker: `${codePart}.KS`,
        name: namePart || codePart,
        currency: 'KRW',
        market: 'KRX'
      }
    }

    // If codePart is a US ticker or already has suffix
    const upperCode = codePart.toUpperCase()
    const stock = tickerMap.get(upperCode) || codeMap.get(upperCode)
    if (stock) {
      return {
        ticker: stock.ticker,
        name: stock.name,
        currency: stock.currency,
        market: stock.market
      }
    }
    const isKoreanTicker = upperCode.endsWith('.KS') || upperCode.endsWith('.KQ')
    return {
      ticker: upperCode,
      name: namePart || upperCode,
      currency: isKoreanTicker ? 'KRW' : 'USD',
      market: isKoreanTicker ? 'KRX' : 'US'
    }
  }

  // 2. Check 6-digit Korean stock code
  if (/^\d{6}$/.test(clean)) {
    const stock = codeMap.get(clean)
    if (stock) {
      return {
        ticker: stock.ticker,
        name: stock.name,
        currency: stock.currency,
        market: stock.market
      }
    }
    // Default to .KS if not in list
    return {
      ticker: `${clean}.KS`,
      name: `한국주식(${clean})`,
      currency: 'KRW',
      market: 'KOSPI'
    }
  }

  // 3. Check Korean stock ticker with .KS or .KQ
  const upperInput = clean.toUpperCase()
  if (/^\d{6}\.(KS|KQ)$/i.test(upperInput)) {
    const code = upperInput.slice(0, 6)
    const stock = codeMap.get(code)
    return {
      ticker: upperInput,
      name: stock?.name || upperInput,
      currency: 'KRW',
      market: stock?.market || (upperInput.endsWith('.KS') ? 'KOSPI' : 'KOSDAQ')
    }
  }

  // 4. Check matching Korean or English stock name
  const nameMatch = nameMap.get(clean.toLowerCase())
  if (nameMatch) {
    return {
      ticker: nameMatch.ticker,
      name: nameMatch.name,
      currency: nameMatch.currency,
      market: nameMatch.market
    }
  }

  // 5. Check if it's an existing ticker in stock list
  const tickerMatch = tickerMap.get(upperInput)
  if (tickerMatch) {
    return {
      ticker: tickerMatch.ticker,
      name: tickerMatch.name,
      currency: tickerMatch.currency,
      market: tickerMatch.market
    }
  }

  // 6. Direct entry (e.g. foreign US ticker like AAPL, PLTR, QQQ)
  return {
    ticker: upperInput,
    name: upperInput,
    currency: 'USD',
    market: 'US'
  }
}

/**
 * Returns Korean display name for a ticker, or ticker itself if not found.
 */
export function getStockDisplayName(ticker: string): string {
  if (!ticker || ticker === 'CASH') return '현금'
  const upper = ticker.toUpperCase()

  // 1. Direct ticker match
  const match = tickerMap.get(upper)
  if (match) return match.name

  // 2. Korean 6-digit match from ticker like "005930.KS"
  const m = upper.match(/^(\d{6})/);
  if (m) {
    const stock = codeMap.get(m[1])
    if (stock) return stock.name
  }

  return ticker
}
