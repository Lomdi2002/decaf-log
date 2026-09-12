import { describe, it, expect } from 'vitest'
import { getLastNDates, buildDailyTotals, formatCaffeineTooltip } from './dailyTotals'

const REFERENCE_DATE = new Date('2026-09-13T12:00:00+09:00')

describe('getLastNDates', () => {
  it('TEST-302: 基準日を含む直近7日分を「古い→新しい」の順で返す', () => {
    const dates = getLastNDates(7, REFERENCE_DATE)

    expect(dates).toHaveLength(7)
    expect(dates[6].getDate()).toBe(13) // 基準日（今日）が最後
    expect(dates[0].getDate()).toBe(7) // 6日前が最初
  })
})

describe('buildDailyTotals', () => {
  it('TEST-303: 単一記録を正しい日に集計する', () => {
    const records = [
      { id: '1', caffeineMg: 100, consumedAt: '2026-09-13T10:00:00+09:00' },
    ]

    const totals = buildDailyTotals(records, { referenceDate: REFERENCE_DATE })

    expect(totals).toHaveLength(7)
    const today = totals.find((t) => t.dateKey === '2026-09-13')
    expect(today.totalMg).toBe(100)
    expect(today.label).toBe('9/13')
  })

  it('TEST-304: 同じ日の複数記録が合算される', () => {
    const records = [
      { id: '1', caffeineMg: 100, consumedAt: '2026-09-13T09:00:00+09:00' },
      { id: '2', caffeineMg: 30, consumedAt: '2026-09-13T15:00:00+09:00' },
    ]

    const totals = buildDailyTotals(records, { referenceDate: REFERENCE_DATE })

    const today = totals.find((t) => t.dateKey === '2026-09-13')
    expect(today.totalMg).toBe(130)
  })

  it('TEST-305: 記録がない日は totalMg: 0 になる', () => {
    const records = [
      { id: '1', caffeineMg: 100, consumedAt: '2026-09-13T10:00:00+09:00' },
    ]

    const totals = buildDailyTotals(records, { referenceDate: REFERENCE_DATE })

    const yesterday = totals.find((t) => t.dateKey === '2026-09-12')
    expect(yesterday.totalMg).toBe(0)
  })

  it('TEST-306: 直近7日間に記録が1件もない場合でも、7件（すべて0mg）が返る', () => {
    const totals = buildDailyTotals([], { referenceDate: REFERENCE_DATE })

    expect(totals).toHaveLength(7)
    expect(totals.every((t) => t.totalMg === 0)).toBe(true)
  })

  it('TEST-307: 直近7日間より前（8日前以上）の記録は集計に含まれない', () => {
    const records = [
      // 8日前（2026-09-05）は集計対象外
      { id: '1', caffeineMg: 999, consumedAt: '2026-09-05T10:00:00+09:00' },
    ]

    const totals = buildDailyTotals(records, { referenceDate: REFERENCE_DATE })

    expect(totals.every((t) => t.totalMg === 0)).toBe(true)
    expect(totals.some((t) => t.dateKey === '2026-09-05')).toBe(false)
  })

  it('ローカルタイムゾーン基準で集計する（UTC日付文字列の切り出しでは判定しない）', () => {
    // UTCでは2026-09-12だが、ローカル(JST)では2026-09-13になる記録。
    const records = [
      { id: '1', caffeineMg: 50, consumedAt: '2026-09-13T00:30:00+09:00' },
    ]

    const totals = buildDailyTotals(records, { referenceDate: REFERENCE_DATE })

    const today = totals.find((t) => t.dateKey === '2026-09-13')
    expect(today.totalMg).toBe(50)
  })
})

describe('formatCaffeineTooltip', () => {
  it('TEST-308: 「◯◯mg」形式の文字列を返す', () => {
    expect(formatCaffeineTooltip(130)).toEqual(['130mg', 'カフェイン摂取量'])
  })

  it('TEST-308: 浮動小数点演算の誤差がそのまま表示されないよう丸める', () => {
    // 0.1 + 0.2 は浮動小数点演算により 0.30000000000000004 になる。
    const result = formatCaffeineTooltip(0.1 + 0.2)
    expect(result[0]).toBe('0.3mg')
  })
})
