'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import EditTradeModal from './EditTradeModal'
import { deleteTrade } from '@/app/(dashboard)/trades/actions'

export default function TradeList({ trades }: { trades: any[] }) {
  const [editingTrade, setEditingTrade] = useState<any | null>(null)
  
  if (!trades || trades.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        No trades recorded yet. Start by adding one on the right.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#0f172a] text-slate-400 text-xs md:text-sm uppercase tracking-wider">
            <th className="px-3 py-3 md:px-6 md:py-4 font-medium min-w-[100px]">Date</th>
            <th className="px-3 py-3 md:px-6 md:py-4 font-medium min-w-[120px]">Ticker</th>
            <th className="px-3 py-3 md:px-6 md:py-4 font-medium min-w-[80px]">Type</th>
            <th className="px-3 py-3 md:px-6 md:py-4 font-medium text-right min-w-[100px]">Price</th>
            <th className="px-3 py-3 md:px-6 md:py-4 font-medium text-right min-w-[100px]">Quantity</th>
            <th className="px-3 py-3 md:px-6 md:py-4 font-medium text-right min-w-[120px]">Total</th>
            <th className="px-3 py-3 md:px-6 md:py-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {trades.map((trade) => {
            const isBuy = trade.type === 'BUY'
            const curSymbol = trade.currency === 'USD' ? '$' : '₩'
            const isKrw = trade.currency === 'KRW'
            return (
              <tr key={trade.trade_id} className="hover:bg-[#334155]/30 transition-colors text-sm">
                <td className="px-3 py-3 md:px-6 md:py-4 text-slate-300 whitespace-nowrap">
                  {format(new Date(trade.trade_date), 'yyyy-MM-dd')}
                </td>
                <td className="px-3 py-3 md:px-6 md:py-4">
                  <div className="font-bold text-white text-base md:text-lg">{trade.ticker}</div>
                  <div className="flex gap-2 mt-1">
                    {trade.sector && trade.sector !== 'Uncategorized' && (
                      <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{trade.sector}</span>
                    )}
                    {trade.account && trade.account !== 'Default' && (
                      <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">{trade.account}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 md:px-6 md:py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 md:px-2.5 md:py-0.5 rounded-full text-xs font-medium ${isBuy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {trade.type}
                  </span>
                </td>
                <td className="px-3 py-3 md:px-6 md:py-4 text-right text-slate-300 whitespace-nowrap">
                  {curSymbol}{trade.price.toLocaleString(undefined, { minimumFractionDigits: isKrw ? 0 : 2, maximumFractionDigits: isKrw ? 0 : 2 })}
                </td>
                <td className="px-3 py-3 md:px-6 md:py-4 text-right text-slate-300 whitespace-nowrap">
                  {trade.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </td>
                <td className="px-3 py-3 md:px-6 md:py-4 text-right text-white font-medium whitespace-nowrap">
                  {curSymbol}{(trade.price * trade.quantity).toLocaleString(undefined, { minimumFractionDigits: isKrw ? 0 : 2, maximumFractionDigits: isKrw ? 0 : 2 })}
                </td>
                <td className="px-3 py-3 md:px-6 md:py-4 text-right">
                  <div className="flex items-center justify-end space-x-3">
                    <button 
                      onClick={() => setEditingTrade(trade)}
                      className="text-slate-400 hover:text-blue-400 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete this trade?')) {
                          try { await deleteTrade(trade.trade_id) } catch(e) { alert('Failed to delete') }
                        }
                      }}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {editingTrade && (
        <EditTradeModal 
          trade={editingTrade} 
          onClose={() => setEditingTrade(null)} 
        />
      )}
    </div>
  )
}
