"use client"

import { useState } from 'react'
import { CompletedTrade } from '@/utils/portfolio'

export default function CompletedTradesTable({ completedTrades, accounts }: { completedTrades: CompletedTrade[], accounts: string[] }) {
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL_ACCOUNTS')

  const filteredTrades = completedTrades.filter(trade => 
    selectedAccount === 'ALL_ACCOUNTS' || trade.account === selectedAccount
  )

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-slate-100">Completed Trades Summary</h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1">매수/매도 완료 종목 성과</p>
        </div>
        <select 
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto cursor-pointer"
        >
          <option value="ALL_ACCOUNTS">All Accounts (전체 계좌)</option>
          {accounts.map(acc => (
            <option key={acc} value={acc}>{acc}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="text-xs text-slate-400 uppercase bg-[#0f172a] border-b border-slate-800">
            <tr>
              <th scope="col" className="px-4 py-3 rounded-tl-lg whitespace-nowrap">종목명 (코드)</th>
              <th scope="col" className="px-4 py-3 text-right whitespace-nowrap">수량</th>
              <th scope="col" className="px-4 py-3 text-right whitespace-nowrap">평균 매수 단가</th>
              <th scope="col" className="px-4 py-3 text-right whitespace-nowrap">평균 매도 단가</th>
              <th scope="col" className="px-4 py-3 text-right whitespace-nowrap">1주당 매매차익</th>
              <th scope="col" className="px-4 py-3 text-right whitespace-nowrap">수익률</th>
              <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">보유 기간</th>
              <th scope="col" className="px-4 py-3 text-center rounded-tr-lg whitespace-nowrap">최초매수 / 최종매도</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500 bg-[#0f172a]/20">
                  해당 계좌에 매매 완료된 종목이 없습니다.
                </td>
              </tr>
            ) : (
              filteredTrades.map((trade, idx) => {
                const isPositive = trade.profitPerShare > 0
                const curSymbol = trade.currency === 'USD' ? '$' : '₩'
                const isKrw = trade.currency === 'KRW'
                
                return (
                  <tr key={`${trade.ticker}_${trade.account}_${idx}`} className="border-b border-slate-800/50 hover:bg-[#0f172a]/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                      {trade.name} <span className="text-slate-500 font-normal text-xs ml-1">({trade.ticker})</span>
                      {selectedAccount === 'ALL_ACCOUNTS' && trade.account !== 'Default' && (
                        <span className="block text-[10px] text-blue-400 mt-0.5">{trade.account}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {trade.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {curSymbol}{trade.averageBuyPrice.toLocaleString(undefined, { minimumFractionDigits: isKrw ? 0 : 2, maximumFractionDigits: isKrw ? 0 : 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {curSymbol}{trade.averageSellPrice.toLocaleString(undefined, { minimumFractionDigits: isKrw ? 0 : 2, maximumFractionDigits: isKrw ? 0 : 2 })}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${isPositive ? 'text-emerald-400' : (trade.profitPerShare < 0 ? 'text-rose-400' : 'text-slate-300')}`}>
                      {trade.profitPerShare > 0 ? '+' : ''}{curSymbol}{trade.profitPerShare.toLocaleString(undefined, { minimumFractionDigits: isKrw ? 0 : 2, maximumFractionDigits: isKrw ? 0 : 2 })}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${isPositive ? 'text-emerald-400' : (trade.profitPerShare < 0 ? 'text-rose-400' : 'text-slate-300')}`}>
                      {trade.profitPerShare > 0 ? '+' : ''}{trade.returnPct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {trade.holdingPeriodDays}일
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-400 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span>{trade.firstBuyDate.split('T')[0]}</span>
                        <span className="text-slate-500">to</span>
                        <span>{trade.lastSellDate.split('T')[0]}</span>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
