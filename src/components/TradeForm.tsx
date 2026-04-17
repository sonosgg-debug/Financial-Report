'use client'

import { addTrade } from '@/app/(dashboard)/trades/actions'
import { useRef, useState } from 'react'

export default function TradeForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [tradeType, setTradeType] = useState('BUY')
  const isCashFlow = tradeType === 'DEPOSIT' || tradeType === 'WITHDRAWAL'

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      await addTrade(formData)
      formRef.current?.reset()
    } catch (e) {
      console.error(e)
      alert("Failed to add trade.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
      <div className="mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Account / 계좌</label>
          <input 
            type="text" 
            name="account"
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
              placeholder="e.g. AAPL"
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
            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
            defaultValue="KRW"
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
            defaultValue={new Date().toISOString().split('T')[0]}
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
              defaultValue={0}
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
          className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Record Trade'}
      </button>
    </form>
  )
}
