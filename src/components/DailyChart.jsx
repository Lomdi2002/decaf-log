import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCaffeineTooltip } from '../lib/dailyTotals'

function DailyChart({ data }) {
  return (
    <div className="daily-chart">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis width={40} tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip formatter={formatCaffeineTooltip} />
          <Bar dataKey="totalMg" fill="#6f4e37" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default DailyChart
