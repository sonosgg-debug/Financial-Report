'use client'

import { addTrade } from '@/app/(dashboard)/trades/actions'
import { useRef, useState } from 'react'
import StockSelector from '@/components/StockSelector'

export default function TradeForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [tradeType, setTradeType] = useState('BUY')
  const [currency, setCurrency] = useState('KRW')
  const [price, setPrice] = useState('')
  const [marketPrice, setMarketPrice] = useState<number | null>(null)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [stockSelectorKey, setStockSelectorKey] = useState(0)

  const isCashFlow = tradeType === 'DEPOSIT' || tradeType === 'WITHDRAWAL'

  const handleStockSelect = async (stock: {
    ticker: string
    name: string
    currency: 'KRW' | 'USD'
    market?: string
    code: string
  }) => {
    // 1. Automatically set currency based on stock market
    setCurrency(stock.currency)

    // 2. Automatically fetch current market price
    if (!isCashFlow && stock.ticker && stock.ticker !== 'CASH') {
      setFetchingPrice(true)
      try {
        const res = await fetch(`/api/stock-price/${encodeURIComponent(stock.ticker)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.price) {
            setMarketPrice(data.price)
            // Autofill price if empty or overwrite with current price
            setPrice(data.price.toString())
          }
        }
      } catch (err) {
        console.error('Failed to fetch stock price:', err)
      } finally {
        setFetchingPrice(false)
      }
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData(event.currentTarget)
      const result = await addTrade(formData)
      if (result && result.error) {
        alert(result.error)
        return
      }
      formRef.current?.reset()
      setPrice('')
      setMarketPrice(null)
      setCurrency('KRW')
      setStockSelectorKey(k => k + 1)
    } catch (e: any) {
      console.error(e)
      alert(e.message || "Failed to add trade.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Sector / 섹터</label>
            <input 
              type="text" 
              name="sector"
              placeholder="e.g. Tech, 반도체"
              className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Ticker / 종목코드</label>
            <StockSelector 
              key={stockSelectorKey}
              name="ticker"
              required={!isCashFlow}
              onSelectStock={handleStockSelect}
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
            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer"
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
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer"
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
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-slate-400">
              {isCashFlow ? 'Amount / 금액' : 'Price / 단가'}
            </label>
            {!isCashFlow && fetchingPrice && (
              <span className="text-[11px] text-blue-400 animate-pulse">조회 중...</span>
            )}
            {!isCashFlow && !fetchingPrice && marketPrice !== null && (
              <button
                type="button"
                onClick={() => setPrice(marketPrice.toString())}
                className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium truncate max-w-[120px]"
                title="현재 시장가로 단가 설정"
              >
                현재가: {currency === 'USD' ? '$' : '₩'}{marketPrice.toLocaleString(undefined, { minimumFractionDigits: currency === 'KRW' ? 0 : 2, maximumFractionDigits: currency === 'KRW' ? 0 : 2 })}
              </button>
            )}
          </div>
          <input 
            type="number" 
            name="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            step="0.01"
            min="0"
            required
            placeholder={marketPrice ? marketPrice.toString() : '0.00'}
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
              min="0"
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
              min="0"
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
