import { describe, it, expect } from 'vitest'
import { calculateStreak } from './streak'

const REFERENCE_DATE = new Date('2026-09-13T12:00:00+09:00') // 今日=9/13, 昨日=9/12

describe('calculateStreak', () => {
  it('TEST-401: 目標がnullのとき status: unset を返す', () => {
    const records = [{ id: '1', caffeineMg: 100, consumedAt: '2026-09-12T10:00:00+09:00' }]
    expect(calculateStreak(records, null, REFERENCE_DATE)).toEqual({ status: 'unset' })
  })

  it('TEST-402: 記録が一度もない場合、days: 0 を返す', () => {
    expect(calculateStreak([], 200, REFERENCE_DATE)).toEqual({ status: 'counted', days: 0 })
  })

  it('TEST-403: 昨日・一昨日が達成、3日前が未達成の場合、days: 2 を返す', () => {
    const records = [
      { id: '1', caffeineMg: 50, consumedAt: '2026-09-12T10:00:00+09:00' }, // 昨日 達成
      { id: '2', caffeineMg: 100, consumedAt: '2026-09-11T10:00:00+09:00' }, // 一昨日 達成
      { id: '3', caffeineMg: 300, consumedAt: '2026-09-10T10:00:00+09:00' }, // 3日前 未達成
      { id: '4', caffeineMg: 100, consumedAt: '2026-09-09T10:00:00+09:00' }, // 4日前（到達しない）
    ]

    expect(calculateStreak(records, 200, REFERENCE_DATE)).toEqual({ status: 'counted', days: 2 })
  })

  it('TEST-404: 今日の合計が目標を超えていても、連続達成日数に影響しない', () => {
    const records = [
      { id: '1', caffeineMg: 500, consumedAt: '2026-09-13T10:00:00+09:00' }, // 今日（対象外）
      { id: '2', caffeineMg: 50, consumedAt: '2026-09-12T10:00:00+09:00' }, // 昨日 達成
    ]

    expect(calculateStreak(records, 200, REFERENCE_DATE)).toEqual({ status: 'counted', days: 1 })
  })

  it('TEST-405: 最初の記録日がちょうど昨日で、達成している場合、days: 1 を返す', () => {
    const records = [{ id: '1', caffeineMg: 50, consumedAt: '2026-09-12T10:00:00+09:00' }]
    expect(calculateStreak(records, 200, REFERENCE_DATE)).toEqual({ status: 'counted', days: 1 })
  })

  it('TEST-406: 最初の記録日がちょうど昨日で、未達成の場合、days: 0 を返す', () => {
    const records = [{ id: '1', caffeineMg: 300, consumedAt: '2026-09-12T10:00:00+09:00' }]
    expect(calculateStreak(records, 200, REFERENCE_DATE)).toEqual({ status: 'counted', days: 0 })
  })

  it('TEST-407: 最初の記録日が今日のみ（過去の記録がない）場合、days: 0 を返す', () => {
    const records = [{ id: '1', caffeineMg: 50, consumedAt: '2026-09-13T10:00:00+09:00' }]
    expect(calculateStreak(records, 200, REFERENCE_DATE)).toEqual({ status: 'counted', days: 0 })
  })

  it('TEST-408: 目標0mg・ある日の記録が0件（0mg扱い）の場合、達成としてカウントされる', () => {
    // 昨日は記録なし(0mg)、一昨日が最初の記録日。
    const records = [{ id: '1', caffeineMg: 0, consumedAt: '2026-09-11T10:00:00+09:00' }]
    expect(calculateStreak(records, 0, REFERENCE_DATE)).toEqual({ status: 'counted', days: 2 })
  })

  it('TEST-409: 目標0mg・ある日の合計が1mg以上の場合、未達成としてカウントされる', () => {
    const records = [{ id: '1', caffeineMg: 1, consumedAt: '2026-09-12T10:00:00+09:00' }]
    expect(calculateStreak(records, 0, REFERENCE_DATE)).toEqual({ status: 'counted', days: 0 })
  })

  it('TEST-410: 同じ日の複数記録が合算された上で判定される', () => {
    const records = [
      { id: '1', caffeineMg: 100, consumedAt: '2026-09-12T09:00:00+09:00' },
      { id: '2', caffeineMg: 100, consumedAt: '2026-09-12T15:00:00+09:00' }, // 合計200 = 目標と一致 → 達成
    ]
    expect(calculateStreak(records, 200, REFERENCE_DATE)).toEqual({ status: 'counted', days: 1 })
  })

  it('TEST-411: ローカルタイムゾーン基準で日付が判定される', () => {
    // UTCでは2026-09-11だが、ローカル(JST)では2026-09-12（昨日）になる記録。
    const records = [{ id: '1', caffeineMg: 50, consumedAt: '2026-09-12T00:30:00+09:00' }]
    expect(calculateStreak(records, 200, REFERENCE_DATE)).toEqual({ status: 'counted', days: 1 })
  })

  it('TEST-418: 目標値とその日の合計値が完全に同じ場合も達成としてカウントされる', () => {
    const records = [{ id: '1', caffeineMg: 200, consumedAt: '2026-09-12T10:00:00+09:00' }]
    expect(calculateStreak(records, 200, REFERENCE_DATE)).toEqual({ status: 'counted', days: 1 })
  })

  it('TEST-419: 連続期間の途中に記録がない日があっても0mgとして達成扱いになる', () => {
    // 昨日(9/12): 記録なし → 0mg → 達成
    // 一昨日(9/11): 100mg → 達成
    // 3日前(9/10): 250mg → 未達成、ここで連続終了
    const records = [
      { id: '1', caffeineMg: 100, consumedAt: '2026-09-11T10:00:00+09:00' },
      { id: '2', caffeineMg: 250, consumedAt: '2026-09-10T10:00:00+09:00' },
    ]
    expect(calculateStreak(records, 200, REFERENCE_DATE)).toEqual({ status: 'counted', days: 2 })
  })
})
