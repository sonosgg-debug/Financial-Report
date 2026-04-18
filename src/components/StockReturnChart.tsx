'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { DailyAssetPoint } from '@/utils/dailyValue'
import { Holding } from '@/utils/portfolio'

export default function StockReturnChart({ 
  data, 
  tickerFirstDates, 
  holdings 
}: { 
  data: DailyAssetPoint[], 
  tickerFirstDates: Record<string, string>, 
  holdings: Holding[] 
}) {
  const [selectedTicker, setSelectedTicker] = useState<string>('')

  // Get unique tickers from holding definitions that have a matching first setup date
  const uniqueHoldings = useMemo(() => {
    const map = new Map<string, { ticker: string, name: string }>()
    holdings.forEach(h => {
      if (h.ticker !== 'CASH' && h.ticker !== 'CASH_USD' && tickerFirstDates[h.ticker]) {
        if (!map.has(h.ticker)) {
          map.set(h.ticker, { ticker: h.ticker, name: h.name })
        }
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [holdings, tickerFirstDates])

  // Set default selection
  useEffect(() => {
    if (uniqueHoldings.length > 0 && !selectedTicker) {
      setSelectedTicker(uniqueHoldings[0].ticker)
    }
  }, [uniqueHoldings, selectedTicker])

  const processedData = useMemo(() => {
    if (!data || data.length === 0 || !selectedTicker) return []

    const firstDate = tickerFirstDates[selectedTicker]
    if (!firstDate) return []

    // Slice from the exact first date
    const startIndex = data.findIndex(d => d.date >= firstDate)
    if (startIndex === -1) return []
    const slice = data.slice(startIndex)

    if (slice.length === 0) return []

    const startPt = slice[0]
    
    // Baselines: find the first available price for each asset from the first date onwards
    let startPriceKospi = startPt['price_^KS11'] as number
    if (typeof startPriceKospi !== 'number') {
      const valid = slice.find(pt => typeof pt['price_^KS11'] === 'number')
      if (valid) startPriceKospi = valid['price_^KS11'] as number
    }

    let startPriceSp500 = startPt['price_^GSPC'] as number
    if (typeof startPriceSp500 !== 'number') {
      const valid = slice.find(pt => typeof pt['price_^GSPC'] === 'number')
      if (valid) startPriceSp500 = valid['price_^GSPC'] as number
    }

    return slice.map((pt: any) => {
      const newPt: any = { date: pt.date }
      
      const vStock = pt[`price_${selectedTicker}`] as number
      const avgCostStock = pt[`avg_cost_${selectedTicker}`] as number
      if (typeof vStock === 'number' && typeof avgCostStock === 'number' && avgCostStock > 0) {
        newPt[`return_${selectedTicker}`] = ((vStock / avgCostStock) - 1) * 100
      }

      const vKospi = pt['price_^KS11'] as number
      if (typeof vKospi === 'number' && typeof startPriceKospi === 'number' && startPriceKospi > 0) {
        newPt['return_KOSPI'] = ((vKospi / startPriceKospi) - 1) * 100
      }
      
      const vSp500 = pt['price_^GSPC'] as number
      if (typeof vSp500 === 'number' && typeof startPriceSp500 === 'number' && startPriceSp500 > 0) {
        newPt['return_SP500'] = ((vSp500 / startPriceSp500) - 1) * 100
      }

      return newPt
    })
  }, [data, selectedTicker, tickerFirstDates])


  if (!data || data.length === 0) {
    return null
  }

  const formatYAxis = (tickItem: number) => {
    return `${tickItem.toFixed(1)}%`
  }

  const selectedName = uniqueHoldings.find(h => h.ticker === selectedTicker)?.name || selectedTicker

  return (
    <div className="w-full flex flex-col h-full min-h-[300px] md:min-h-[450px]">
      <div className="flex flex-col md:flex-row justify-between mb-4 md:items-center space-y-2 md:space-y-0">
        
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <label htmlFor="ticker-select" className="text-sm text-slate-400 font-medium">종목 선택:</label>
          <select 
            id="ticker-select"
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
            className="flex-1 md:flex-none bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            {uniqueHoldings.map(h => (
              <option key={h.ticker} value={h.ticker}>{h.name} ({h.ticker})</option>
            ))}
          </select>
        </div>

        {selectedTicker && tickerFirstDates[selectedTicker] && (
          <div className="text-sm text-slate-400">
            기준일 (First Buy Date): <span className="font-semibold text-slate-300">{tickerFirstDates[selectedTicker]}</span>
          </div>
        )}

      </div>
      
      <div className="flex-1">
        {processedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={processedData}
              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8" 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                tickMargin={10}
                minTickGap={30}
              />
              <YAxis 
                stroke="#94a3b8" 
                tickFormatter={formatYAxis}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                width={65}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
                formatter={(value: any, name: any) => {
                  let displayName = String(name)
                  if (displayName.startsWith('return_')) {
                    const rawName = displayName.replace('return_', '')
                    if (rawName === selectedTicker) displayName = selectedName
                    else displayName = rawName
                  }
                  const numValue = Number(value)
                  return [`${numValue > 0 ? '+' : ''}${numValue.toFixed(2)}%`, displayName]
                }}
                labelStyle={{ color: '#94a3b8', marginBottom: '8px' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }} 
                formatter={(value: string) => {
                  if (value.startsWith('return_')) {
                    const cleaned = value.replace('return_', '')
                    return cleaned === selectedTicker ? selectedName : cleaned
                  }
                  return value
                }}
              />
              
              {/* Selected Stock Line */}
              <Line
                key={`return_${selectedTicker}`}
                type="monotone"
                dataKey={`return_${selectedTicker}`}
                name={`return_${selectedTicker}`}
                stroke="#10b981" // emerald-500
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />

              {/* Benchmarks */}
              <Line
                key="return_KOSPI"
                type="monotone"
                dataKey="return_KOSPI"
                name="return_KOSPI"
                stroke="#fbbf24" // yellow
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
              <Line
                key="return_SP500"
                type="monotone"
                dataKey="return_SP500"
                name="return_SP500"
                stroke="#a855f7" // purple
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            데이터가 없습니다 (No data available).
          </div>
        )}
      </div>
    </div>
  )
}
