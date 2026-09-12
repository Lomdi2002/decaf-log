import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DailyChart from './DailyChart'
import { formatCaffeineTooltip } from '../lib/dailyTotals'

// Rechartsの内部SVG構造・ResponsiveContainerの実サイズ計測には依存しない。
// DailyChartが正しいpropsをRechartsの各コンポーネントへ渡していることのみを検証する。
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ data, children }) => (
    <div data-testid="bar-chart" data-count={data.length}>
      {children}
    </div>
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: ({ formatter }) => (
    <div data-testid="tooltip" data-formatter-result={JSON.stringify(formatter(10))} />
  ),
  Bar: ({ isAnimationActive }) => (
    <div data-testid="bar" data-animation-active={String(isAnimationActive)} />
  ),
}))

const SEVEN_DAYS_DATA = [
  { dateKey: '2026-09-07', label: '9/7', totalMg: 0 },
  { dateKey: '2026-09-08', label: '9/8', totalMg: 0 },
  { dateKey: '2026-09-09', label: '9/9', totalMg: 100 },
  { dateKey: '2026-09-10', label: '9/10', totalMg: 0 },
  { dateKey: '2026-09-11', label: '9/11', totalMg: 30 },
  { dateKey: '2026-09-12', label: '9/12', totalMg: 0 },
  { dateKey: '2026-09-13', label: '9/13', totalMg: 130 },
]

describe('DailyChart', () => {
  it('TEST-309: 7日分のデータをBarChartへ渡す', () => {
    render(<DailyChart data={SEVEN_DAYS_DATA} />)

    expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-count', '7')
  })

  it('Barのアニメーションが無効化されている', () => {
    render(<DailyChart data={SEVEN_DAYS_DATA} />)

    expect(screen.getByTestId('bar')).toHaveAttribute('data-animation-active', 'false')
  })

  it('TooltipにformatCaffeineTooltipが渡されている', () => {
    render(<DailyChart data={SEVEN_DAYS_DATA} />)

    const expected = JSON.stringify(formatCaffeineTooltip(10))
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-formatter-result', expected)
  })
})
