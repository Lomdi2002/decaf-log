import { describe, it, expect, afterEach, vi } from 'vitest'
import { formatDate, formatTime, isToday, toDatetimeLocalValue } from './dateUtils'

describe('dateUtils', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formatDate はローカルタイムゾーンで YYYY/MM/DD 形式にする', () => {
    // テスト実行タイムゾーンは Asia/Tokyo (vite.config.js の test.env.TZ) に固定している。
    expect(formatDate('2026-09-12T10:00:00+09:00')).toBe('2026/09/12')
  })

  it('formatTime はローカルタイムゾーンで HH:mm 形式にする', () => {
    expect(formatTime('2026-09-12T09:05:00+09:00')).toBe('09:05')
  })

  it('isToday はローカルタイムゾーンの日付境界で「今日」を判定する', () => {
    // システム時刻を 2026-09-13 00:30 (JST) に固定する。
    // このときUTCでは 2026-09-12 15:30 であり、UTCの日付文字列だけで
    // 判定すると「12日」になってしまう。ローカル(JST)基準では13日である。
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-13T00:30:00+09:00'))

    // ローカル(JST)で同じ13日の記録は「今日」
    expect(isToday('2026-09-13T00:10:00+09:00')).toBe(true)

    // UTCでは12日と一致するが、ローカル(JST)では12日なので「今日ではない」
    expect(isToday('2026-09-12T23:50:00+09:00')).toBe(false)
  })

  it('isToday は日付が異なる場合はfalseを返す', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-12T10:00:00+09:00'))

    expect(isToday('2026-09-11T23:59:00+09:00')).toBe(false)
  })

  it('toDatetimeLocalValue はローカルタイムゾーンの datetime-local 文字列を返す', () => {
    expect(toDatetimeLocalValue('2026-09-12T09:05:00+09:00')).toBe('2026-09-12T09:05')
  })
})
