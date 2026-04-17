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

  // Calculate the overall min and max values across all plotted attributes
  let minValue = Infinity;
  let maxValue = -Infinity;
  for (const row of data) {
    for (const key of ['Total', ...accounts]) {
      if (typeof row[key] === 'number') {
        if (row[key] < minValue) minValue = row[key];
        if (row[key] > maxValue) maxValue = row[key];
      }
    }
  }
  if (minValue === Infinity) {
    minValue = 0;
    maxValue = 0;
  }

  // Calculate dynamic step for nice tick intervals
  const range = maxValue - minValue;
  const rawStep = range > 0 ? range / 5 : 10000000;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalizedStep = rawStep / magnitude;
  
  let stepMultiplier = 1;
  if (normalizedStep <= 1) stepMultiplier = 1;
  else if (normalizedStep <= 2) stepMultiplier = 2;
  else if (normalizedStep <= 5) stepMultiplier = 5;
  else stepMultiplier = 10;
  
  const STEP = stepMultiplier * magnitude;
  
  // Create a slight padding so the line doesn't completely touch the bottom/top
  let minTick = Math.floor((minValue - STEP * 0.1) / STEP) * STEP;
  let maxTick = Math.ceil((maxValue + STEP * 0.1) / STEP) * STEP;
  
  if (minTick === maxTick) {
    minTick -= STEP;
    maxTick += STEP;
  }
  
  const ticks: number[] = [];
  for (let i = minTick; i <= maxTick + (STEP / 2); i += STEP) {
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
            domain={[minTick, maxTick]}
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
