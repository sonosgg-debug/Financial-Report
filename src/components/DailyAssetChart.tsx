'use client'

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
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
]

export default function DailyAssetChart({ data, accounts }: { data: DailyAssetPoint[], accounts: string[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 min-h-[300px]">
        No historical data available.
      </div>
    )
  }

  // Calculate ticks for YAxis (25,000,000 KRW increments)
  let maxValue = 0;
  for (const row of data) {
    if (typeof row['Total'] === 'number' && row['Total'] > maxValue) {
      maxValue = row['Total'];
    }
  }
  
  const STEP = 25000000; // 25,000,000
  const maxTick = Math.ceil(maxValue / STEP) * STEP;
  const ticks: number[] = [];
  for (let i = 0; i <= Math.max(maxTick, STEP); i += STEP) {
    ticks.push(i);
  }

  // Format numbers to KRW currency format
  const formatYAxis = (tickItem: number) => {
    const formatted = new Intl.NumberFormat('ko-KR', {
      notation: "compact",
      compactDisplay: "short"
    }).format(tickItem)
    return formatted.endsWith('만') || formatted.endsWith('억') || formatted.endsWith('조') 
      ? formatted + '원' 
      : formatted;
  }

  return (
    <div className="w-full h-full min-h-[300px] md:min-h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 20,
            bottom: 5,
          }}
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
            width={85}
            ticks={ticks}
            domain={[0, Math.max(maxTick, STEP)]}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
            itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
            formatter={(value: any, name: any) => [
              new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Number(value)),
              String(name)
            ]}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          {accounts.map((account, index) => (
            <Line
              key={account}
              type="monotone"
              dataKey={account}
              name={account}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          ))}
          {/* Total Assets Line */}
          <Line
            key="Total"
            type="monotone"
            dataKey="Total"
            name="Total Assets (총 자산)"
            stroke="#ef4444" // red
            strokeWidth={4}
            dot={false}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
