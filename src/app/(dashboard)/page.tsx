import { getPortfolio } from '@/utils/portfolio'
import { getDailyAssetHistory } from '@/utils/dailyValue'
import { TrendingUp, TrendingDown, PieChart as PieChartIcon } from 'lucide-react'
import DashboardViews from '@/components/DashboardViews'

export default async function DashboardPage() {
  const [ { holdings, totalValue, totalCost }, dailyAssets ] = await Promise.all([
    getPortfolio(),
    getDailyAssetHistory()
  ])

  const totalReturn = totalValue - totalCost
  const totalReturnPct = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0
  const isPositive = totalReturn >= 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-white">Portfolio Overview</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2 md:mb-3">
            <h3 className="text-sm font-medium">Total Balance</h3>
          </div>
          <p className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            ₩{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2 md:mb-3">
            <h3 className="text-sm font-medium">Total Invested</h3>
            <PieChartIcon className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl md:text-3xl font-semibold text-slate-200 tracking-tight">
            ₩{totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-[#1e293b] rounded-xl border border-slate-800 p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2 md:mb-3">
            <h3 className="text-sm font-medium">Total Return</h3>
            {isPositive ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
          </div>
          <div className="flex items-baseline space-x-2">
            <p className={`text-2xl md:text-3xl font-semibold tracking-tight ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? '+' : '-'}₩{Math.abs(totalReturn).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className={`text-sm font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
              ({isPositive ? '+' : ''}{totalReturnPct.toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>

      <DashboardViews holdings={holdings} dailyAssets={dailyAssets} />
    </div>
  )
}
