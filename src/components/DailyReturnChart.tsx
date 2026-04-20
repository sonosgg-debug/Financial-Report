'use client'

import { useState, useMemo } from 'react'
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

const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
]

type Period = '1W' | '1M' | '3M' | 'ALL'

export default function DailyReturnChart({ 
  data, 
  accounts, 
  returnType = 'TWR', 
  selectedAccount = 'ALL_ACCOUNTS' 
}: { 
  data: DailyAssetPoint[], 
  accounts: string[],
  returnType?: 'TWR' | 'MWR',
  selectedAccount?: string
}) {
  const [period, setPeriod] = useState<Period>('1M')

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return []

    let startDate = new Date(data[0].date)
    const endDate = new Date(data[data.length - 1].date)

    if (period === '1W') {
      startDate = new Date(endDate)
      startDate.setDate(endDate.getDate() - 7)
    } else if (period === '1M') {
      startDate = new Date(endDate)
      startDate.setMonth(endDate.getMonth() - 1)
    } else if (period === '3M') {
      startDate = new Date(endDate)
      startDate.setMonth(endDate.getMonth() - 3)
    }

    const startStr = startDate.toISOString().split('T')[0]
    const startIndex = data.findIndex(d => d.date >= startStr)
    const slice = data.slice(startIndex !== -1 ? startIndex : 0)

    if (slice.length === 0) return []

    const prefix = returnType === 'TWR' ? 'return_' : 'mwr_'
    let accountLines: string[] = []
    let hasTotal = true
    
    if (selectedAccount === 'ALL_ACCOUNTS') {
      accountLines = accounts.map(a => `${prefix}${a}`)
    } else {
      accountLines = [`${prefix}${selectedAccount}`]
      hasTotal = false
    }

    const linesToTrack = [...accountLines, ...(hasTotal ? [`${prefix}Total`] : []), 'return_KOSPI', 'return_SP500']
    
    // Find the first valid value in the slice for each line to use as baseline
    const startValues: Record<string, number> = {}
    for (const key of linesToTrack) {
      const firstValidPt = slice.find(pt => typeof pt[key] === 'number')
      if (firstValidPt) {
        startValues[key] = firstValidPt[key] as number
      }
    }

    return slice.map(pt => {
      const newPt: any = { date: pt.date }
      
      for (const key of linesToTrack) {
        const val = pt[key] as number
        if (key === 'return_KOSPI' || key === 'return_SP500' || returnType === 'TWR') {
          // Rebase for TWR and Benchmarks
          const startVal = startValues[key]
          if (typeof val === 'number' && typeof startVal === 'number') {
            const rebased = (((val / 100 + 1) / (startVal / 100 + 1)) - 1) * 100
            newPt[key] = rebased
          }
        } else {
          // For MWR, simply take the relative difference if period is not ALL?
          // Since MWR represents total return since inception of capital, rebasing it might not be conceptually perfectly equivalent to IRR rebasing, but we can subtract start value
          // or just show the absolute MWR since inception. Let's just track absolute MWR since inception for simplicity, or rebase it additively.
          // Additive rebasing: (current MWR - start MWR).
          const startVal = startValues[key]
          if (typeof val === 'number' && typeof startVal === 'number') {
            newPt[key] = val - startVal
          }
        }
      }
      return newPt
    })
  }, [data, period, accounts, returnType, selectedAccount])


  if (!data || data.length === 0) {
    return null
  }

  const formatYAxis = (tickItem: number) => {
    return `${tickItem.toFixed(1)}%`
  }

  return (
    <div className="w-full flex flex-col h-full min-h-[300px] md:min-h-[450px]">
      <div className="flex justify-end mb-4">
        <div className="flex bg-[#0f172a] p-1 rounded-lg border border-slate-800">
          {(['1W', '1M', '3M', 'ALL'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${period === p ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1">
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
                displayName = displayName.replace('return_', '').replace('mwr_', '')
                if (displayName === 'Total') displayName = 'Total Return'
                const numValue = Number(value)
                return [`${numValue > 0 ? '+' : ''}${numValue.toFixed(2)}%`, displayName]
              }}
              labelStyle={{ color: '#94a3b8', marginBottom: '8px' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }} 
              formatter={(value: string) => {
                const isTotal = value.endsWith('_Total')
                let cleaned = value.replace('return_', '').replace('mwr_', '')
                return isTotal ? 'Total (초과수익)' : cleaned
              }}
            />
            
            {/* Account Lines */}
            {(selectedAccount === 'ALL_ACCOUNTS' ? accounts : [selectedAccount]).map((account, index) => {
              const prefix = returnType === 'TWR' ? 'return_' : 'mwr_'
              const dataKey = `${prefix}${account}`
              const accountOriginalIndex = accounts.indexOf(account)
              const colorIndex = accountOriginalIndex !== -1 ? accountOriginalIndex : index
              return (
                <Line
                  key={dataKey}
                  type="monotone"
                  dataKey={dataKey}
                  name={dataKey}
                  stroke={COLORS[colorIndex % COLORS.length]}
                  strokeWidth={selectedAccount === 'ALL_ACCOUNTS' ? 2 : 3}
                  dot={false}
                  activeDot={{ r: selectedAccount === 'ALL_ACCOUNTS' ? 6 : 8 }}
                />
              )
            })}
            
            {/* Total Line */}
            {selectedAccount === 'ALL_ACCOUNTS' && (
              <Line
                key={`total_line`}
                type="monotone"
                dataKey={returnType === 'TWR' ? 'return_Total' : 'mwr_Total'}
                name={returnType === 'TWR' ? 'return_Total' : 'mwr_Total'}
                stroke="#ef4444" // red
                strokeWidth={4}
                dot={false}
                activeDot={{ r: 8 }}
              />
            )}

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
      </div>
    </div>
  )
}
