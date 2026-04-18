import { createClient } from '@/utils/supabase/server'
import { PlusCircle } from 'lucide-react'
import TradeForm from '@/components/TradeForm'
import TradeList from '@/components/TradeList'

export default async function TradesPage() {
  const supabase = await createClient()

  // Fetch trades
  const { data: trades, error } = await supabase
    .from('trades')
    .select('*')
    .order('trade_date', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Trade History</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] rounded-2xl border border-slate-800 p-6 shadow-sm h-fit">
          <div className="flex items-center space-x-2 mb-6">
            <PlusCircle className="text-blue-400 w-6 h-6" />
            <h2 className="text-xl font-semibold text-slate-100">Record Trade</h2>
          </div>
          <TradeForm />
        </div>

        <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
             <h2 className="text-xl font-semibold text-slate-100">All Transactions</h2>
          </div>
          <TradeList trades={trades || []} />
        </div>
      </div>
    </div>
  )
}
