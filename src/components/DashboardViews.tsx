'use client'

import { useState } from 'react'
import AllocationChart from '@/components/AllocationChart'
import DailyAssetChart from '@/components/DailyAssetChart'
import DailyReturnChart from '@/components/DailyReturnChart'
import { DailyAssetPoint } from '@/utils/dailyValue'

type TabType = 'ALL' | 'US' | 'KR'

export default function DashboardViews({ 
  holdings, 
  dailyAssets 
}: { 
  holdings: any[], 
  dailyAssets: { data: DailyAssetPoint[], accounts: string[] } 
}) {
  const [activeTab, setActiveTab] = useState<TabType>('ALL')

  const [activeAccount, setActiveAccount] = useState<string>('ALL_ACCOUNTS')
  const [chartGroup, setChartGroup] = useState<'SECTOR' | 'TICKER'>('TICKER')

  const uniqueAccounts = Array.from(new Set(holdings.map(h => h.account || 'Default')))

  const filteredHoldings = holdings.filter(h => {
    if (activeTab === 'US' && h.currency !== 'USD') return false
    if (activeTab === 'KR' && h.currency !== 'KRW') return false
    if (activeAccount !== 'ALL_ACCOUNTS' && (h.account || 'Default') !== activeAccount) return false
    return true
  })

  const allocationChartData = chartGroup === 'SECTOR'
    ? Object.values(filteredHoldings.reduce((acc, holding) => {
        const sector = holding.sector || 'Uncategorized'
        if (!acc[sector]) {
          acc[sector] = { name: sector, currentValueKrw: 0 }
        }
        acc[sector].currentValueKrw += holding.currentValueKrw
        return acc
      }, {} as Record<string, { name: string; currentValueKrw: number }>))
    : Object.values(filteredHoldings.reduce((acc, holding) => {
        const name = holding.name || holding.ticker
        if (!acc[name]) {
          acc[name] = { name: name, currentValueKrw: 0 }
        }
        acc[name].currentValueKrw += holding.currentValueKrw
        return acc
      }, {} as Record<string, { name: string; currentValueKrw: number }>))

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {/* Tabs */}
        <div className="flex overflow-x-auto w-full md:w-auto space-x-2 bg-[#1e293b] p-1.5 rounded-xl border border-slate-800 pb-2 md:pb-1">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'ALL' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            All Assets
          </button>
          <button
            onClick={() => setActiveTab('US')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'US' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            US Stocks
          </button>
          <button
            onClick={() => setActiveTab('KR')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'KR' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Korean Stocks
          </button>
        </div>

        {/* Account Selector */}
        <select 
          value={activeAccount}
          onChange={(e) => setActiveAccount(e.target.value)}
          className="bg-[#1e293b] border border-slate-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:max-w-xs cursor-pointer"
        >
          <option value="ALL_ACCOUNTS">All Accounts (전체 계좌)</option>
          {uniqueAccounts.map(acc => (
            <option key={acc} value={acc}>{acc}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-[#1e293b] rounded-2xl border border-slate-800 p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-slate-100">Asset Allocation</h2>
            <div className="flex bg-[#0f172a] p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setChartGroup('TICKER')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartGroup === 'TICKER' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                종목별
              </button>
              <button
                onClick={() => setChartGroup('SECTOR')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${chartGroup === 'SECTOR' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                섹터별
              </button>
            </div>
          </div>
          <AllocationChart data={allocationChartData} />
        </div>

        <div className="bg-[#1e293b] rounded-2xl border border-slate-800 p-4 md:p-6 shadow-sm flex flex-col">
          <h2 className="text-lg md:text-xl font-semibold text-slate-100 mb-4 md:mb-6">Current Holdings {activeTab !== 'ALL' && `(${activeTab})`}</h2>
          <div className="flex-1 overflow-auto max-h-[400px]">
            {filteredHoldings.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 py-10">
                No active holdings in this category.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHoldings.sort((a,b) => b.currentValue - a.currentValue).map(holding => {
                  const curSymbol = holding.currency === 'USD' ? '$' : '₩'
                  const isKrw = holding.currency === 'KRW'
                  return (
                  <div key={`${holding.ticker}_${holding.account}`} className="flex items-center justify-between p-4 bg-[#0f172a] rounded-xl border border-slate-800/50 hover:border-slate-700/50 transition-colors">
                    <div>
                      <h4 className="font-bold text-white text-lg">{holding.name} <span className="text-sm font-normal text-slate-500 ml-1">({holding.ticker})</span></h4>
                      <p className="text-sm text-slate-400">
                        {holding.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares @ {curSymbol}{holding.averageCost.toLocaleString(undefined, { minimumFractionDigits: isKrw ? 0 : 2, maximumFractionDigits: isKrw ? 0 : 2 })}
                        {holding.account && holding.account !== 'Default' && <span className="ml-2 px-2 py-0.5 bg-blue-900/30 text-blue-400 text-xs rounded-full">{holding.account}</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white text-sm md:text-base">{curSymbol}{holding.currentValue.toLocaleString(undefined, { minimumFractionDigits: isKrw ? 0 : 2, maximumFractionDigits: isKrw ? 0 : 2 })}</p>
                      <p className={`text-xs md:text-sm font-medium ${holding.unrealizedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {holding.unrealizedReturn >= 0 ? '+' : '-'}{curSymbol}{Math.abs(holding.unrealizedReturn).toLocaleString(undefined, { minimumFractionDigits: isKrw ? 0 : 2, maximumFractionDigits: isKrw ? 0 : 2 })} ({holding.unrealizedReturnPct.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-slate-800 p-4 md:p-6 shadow-sm">
        <h2 className="text-lg md:text-xl font-semibold text-slate-100 mb-4 md:mb-6">Daily Asset Value (KRW)</h2>
        <div className="h-[300px] md:h-[400px]">
          <DailyAssetChart data={dailyAssets.data} accounts={dailyAssets.accounts} />
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-slate-800 p-4 md:p-6 shadow-sm w-full">
        <h2 className="text-lg md:text-xl font-semibold text-slate-100 mb-2">Daily Cumulative Return (%) - Time Weighted</h2>
        <p className="text-xs md:text-sm text-slate-400 mb-4 md:mb-6">순수 펀드 운용 수익률 (입출금 왜곡 방지 적용)</p>
        <div className="h-[300px] md:h-[450px]">
          <DailyReturnChart data={dailyAssets.data} accounts={dailyAssets.accounts} />
        </div>
      </div>
    </div>
  )
}
