'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import { Search, X, Check } from 'lucide-react'
import { StockItem, resolveStockTicker, getStockDisplayName } from '@/utils/stockSearch'

interface StockSelectorProps {
  name?: string
  defaultValue?: string
  onSelectStock?: (stock: {
    ticker: string
    name: string
    currency: 'KRW' | 'USD'
    market?: string
    code: string
  }) => void
  required?: boolean
  disabled?: boolean
  placeholder?: string
}

export default function StockSelector({
  name = 'ticker',
  defaultValue = '',
  onSelectStock,
  required = false,
  disabled = false,
  placeholder = '종목명(한글/영문) 또는 코드(005930, AAPL) 검색'
}: StockSelectorProps) {
  // Resolved state
  const [selectedTicker, setSelectedTicker] = useState<string>(defaultValue)
  const [displayText, setDisplayText] = useState<string>('')
  
  // Search / Dropdown state
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [isComposing, setIsComposing] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [, startTransition] = useTransition()

  // Initialize display text from defaultValue
  useEffect(() => {
    if (defaultValue) {
      const resolved = resolveStockTicker(defaultValue)
      setSelectedTicker(resolved.ticker)
      const codePart = resolved.ticker.replace(/\.(KS|KQ)$/, '')
      setDisplayText(resolved.name !== resolved.ticker ? `${resolved.name} (${codePart})` : resolved.ticker)
    } else {
      setSelectedTicker('')
      setDisplayText('')
    }
  }, [defaultValue])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch search results
  useEffect(() => {
    if (!isOpen) return

    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      fetch(`/api/stocks/search?q=${encodeURIComponent(displayText)}&limit=15`, {
        signal: controller.signal
      })
        .then(res => res.json())
        .then(data => {
          setResults(data.results || [])
          setHighlightedIndex(-1)
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Failed to search stocks:', err)
          }
        })
        .finally(() => setLoading(false))
    }, 120)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [displayText, isOpen])

  const handleSelect = (stock: StockItem) => {
    const codePart = stock.code
    const label = `${stock.name} (${codePart})`
    setSelectedTicker(stock.ticker)
    setDisplayText(label)
    setIsOpen(false)

    if (onSelectStock) {
      onSelectStock({
        ticker: stock.ticker,
        name: stock.name,
        currency: stock.currency,
        market: stock.market,
        code: stock.code
      })
    }
  }

  const handleCustomSelect = (customText: string) => {
    const resolved = resolveStockTicker(customText)
    const codePart = resolved.ticker.replace(/\.(KS|KQ)$/, '')
    const label = resolved.name !== resolved.ticker ? `${resolved.name} (${codePart})` : resolved.ticker
    setSelectedTicker(resolved.ticker)
    setDisplayText(label)
    setIsOpen(false)

    if (onSelectStock) {
      onSelectStock({
        ticker: resolved.ticker,
        name: resolved.name,
        currency: resolved.currency,
        market: resolved.market,
        code: codePart
      })
    }
  }

  const handleClear = () => {
    setSelectedTicker('')
    setDisplayText('')
    setIsOpen(true)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) return // Don't intercept during IME composition

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
        return
      }
    }

    const hasCustomOption = displayText.trim().length > 0
    const totalCount = results.length + (hasCustomOption ? 1 : 0)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev + 1 < totalCount ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev - 1 >= 0 ? prev - 1 : totalCount - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        handleSelect(results[highlightedIndex])
      } else if (highlightedIndex === results.length && hasCustomOption) {
        handleCustomSelect(displayText)
      } else if (results.length > 0) {
        // Default to first match if enter pressed without arrow selection
        handleSelect(results[0])
      } else if (hasCustomOption) {
        handleCustomSelect(displayText)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const getMarketBadge = (market: string) => {
    switch (market.toUpperCase()) {
      case 'KOSPI':
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">KOSPI</span>
      case 'KOSDAQ':
      case 'KOSDAQ GLOBAL':
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">KOSDAQ</span>
      case 'US':
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-500/20 text-purple-400 rounded border border-purple-500/30">US</span>
      default:
        return <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-700 text-slate-300 rounded">{market}</span>
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input storing the actual normalized ticker for form submission */}
      <input 
        type="hidden" 
        name={name} 
        value={selectedTicker} 
        required={required} 
      />

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={displayText}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setDisplayText(e.target.value)
            setSelectedTicker(e.target.value)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors text-sm"
        />

        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />

        {displayText && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 text-slate-400 hover:text-white transition-colors p-1"
            title="지우기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-800/60">
          {loading && results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">검색 중...</div>
          ) : results.length === 0 && !displayText.trim() ? (
            <div className="p-4 text-center text-xs text-slate-400">
              종목명(예: 삼성전자, 엔비디아) 또는 티커/코드(005930, AAPL)를 입력하세요.
            </div>
          ) : (
            <>
              {results.map((item, idx) => {
                const isSelected = selectedTicker === item.ticker
                const isHighlighted = highlightedIndex === idx

                return (
                  <div
                    key={`${item.ticker}_${idx}`}
                    onMouseDown={(e) => {
                      e.preventDefault() // prevent blur
                      handleSelect(item)
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                      isHighlighted ? 'bg-blue-600/30 text-white' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 overflow-hidden">
                      {getMarketBadge(item.market)}
                      <span className="font-semibold text-white truncate">{item.name}</span>
                      <span className="text-xs text-slate-400 font-mono">({item.code})</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-slate-400 font-mono">{item.currency}</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                    </div>
                  </div>
                )
              })}

              {/* Direct entry option */}
              {displayText.trim().length > 0 && (
                <div
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleCustomSelect(displayText)
                  }}
                  onMouseEnter={() => setHighlightedIndex(results.length)}
                  className={`px-3 py-2.5 cursor-pointer text-xs transition-colors flex items-center justify-between ${
                    highlightedIndex === results.length ? 'bg-blue-600/30 text-white' : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="text-slate-400">
                    직접 입력: <strong className="text-white">"{displayText.trim()}"</strong> 티커로 기록
                  </span>
                  <span className="text-[10px] text-slate-500">[Enter]</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
