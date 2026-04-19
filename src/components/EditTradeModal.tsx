'use client'

import { useState, useRef, useEffect } from 'react'
import { updateTrade } from '@/app/(dashboard)/trades/actions'
import { format } from 'date-fns'

export default function EditTradeModal({ 
  trade, 
  onClose 
}: { 
  trade: any, 
  onClose: () => void 
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [tradeType, setTradeType] = useState(trade.type || 'BUY')
  const isCashFlow = tradeType === 'DEPOSIT' || tradeType === 'WITHDRAWAL'

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      await updateTrade(formData)
      onClose()
    } catch (e) {
      console.error(e)
      alert("Failed to update trade.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Edit Trade</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        
        <form ref={formRef} action={handleSubmit} className="p-6 flex flex-col gap-4">
          <input type="hidden" name="trade_id" value={trade.trade_id} />
          
          <div className="mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Account / 계좌</label>
              <input 
                type="text" 
                name="account"
                defaultValue={trade.account || ''}
                placeholder="e.g. 키움증권"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
          {!isCashFlow && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Sector / 섹터</label>
                <input 
                  type="text" 
                  name="sector"
                  defaultValue={trade.sector || ''}
                  placeholder="e.g. Tech"
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Ticker / 종목코드</label>
                <input 
                  type="text" 
                  name="ticker"
                  required={!isCashFlow}
                  defaultValue={trade.ticker}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Type / 매매</label>
              <select 
                name="type" 
                required
                value={tradeType}
                onChange={(e) => setTradeType(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
              >
                <option value="BUY">BUY (매수)</option>
                <option value="SELL">SELL (매도)</option>
                <option value="DEPOSIT">DEPOSIT (입금)</option>
                <option value="WITHDRAWAL">WITHDRAWAL (출금)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Currency / 통화</label>
              <select 
                name="currency" 
                required
                defaultValue={trade.currency}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
              >
                <option value="KRW">원 (KRW)</option>
                <option value="USD">달러 (USD)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Date / 일자</label>
              <input 
                type="date" 
                name="date"
                required
                max="9999-12-31"
                defaultValue={format(new Date(trade.trade_date), 'yyyy-MM-dd')}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                {isCashFlow ? 'Amount / 금액' : 'Price / 단가'}
              </label>
              <input 
                type="number" 
                name="price"
                step="0.01"
                required
                defaultValue={trade.price}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            {!isCashFlow && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Quantity / 수량</label>
                <input 
                  type="number" 
                  name="quantity"
                  step="0.0001"
                  required
                  defaultValue={trade.quantity}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}
            {!isCashFlow && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Fee / 수수료 (선택)</label>
                <input 
                  type="number" 
                  name="fee"
                  step="0.01"
                  defaultValue={trade.fee || 0}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Notes / 메모 (선택)</label>
            <textarea 
              name="notes"
              rows={2}
              defaultValue={trade.notes || ''}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="mt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
