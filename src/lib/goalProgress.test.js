import { describe, it, expect } from 'vitest'
import { calculateGoalProgress } from './goalProgress'

describe('calculateGoalProgress', () => {
  it('TEST-201: 目標がnullのとき status: unset を返す', () => {
    expect(calculateGoalProgress(100, null)).toEqual({ status: 'unset' })
  })

  it('TEST-202: 目標0mg・今日0mgのとき status: within-zero を返す', () => {
    expect(calculateGoalProgress(0, 0)).toEqual({ status: 'within-zero' })
  })

  it('TEST-203: 目標0mg・今日1mg以上のとき status: exceeded-zero を返す', () => {
    expect(calculateGoalProgress(1, 0)).toEqual({ status: 'exceeded-zero' })
  })

  it('TEST-204: 目標200mg・今日100mgのとき normal, percent 50, remainingMg 100', () => {
    expect(calculateGoalProgress(100, 200)).toEqual({
      status: 'normal',
      percent: 50,
      barWidthPercent: 50,
      remainingMg: 100,
    })
  })

  it('TEST-205: 目標200mg・今日200mgのとき reached, percent 100', () => {
    expect(calculateGoalProgress(200, 200)).toEqual({
      status: 'reached',
      percent: 100,
      barWidthPercent: 100,
    })
  })

  it('TEST-206: 目標200mg・今日250mgのとき exceeded, percent 125, overMg 50', () => {
    expect(calculateGoalProgress(250, 200)).toEqual({
      status: 'exceeded',
      percent: 125,
      barWidthPercent: 100,
      overMg: 50,
    })
  })

  it('TEST-207: いかなる組み合わせでも戻り値にNaN・Infinityが含まれない', () => {
    const cases = [
      [0, null],
      [0, 0],
      [1, 0],
      [0, 200],
      [200, 200],
      [250, 200],
      [1e9, 1],
    ]

    for (const [todayTotalMg, goalMg] of cases) {
      const result = calculateGoalProgress(todayTotalMg, goalMg)
      for (const value of Object.values(result)) {
        if (typeof value === 'number') {
          expect(Number.isNaN(value)).toBe(false)
          expect(Number.isFinite(value)).toBe(true)
        }
      }
    }
  })

  it('TEST-216（境界値）: 目標200mg・今日199.6mgのとき、percentは丸めで100になり得るがstatusはnormal', () => {
    const result = calculateGoalProgress(199.6, 200)
    expect(result.status).toBe('normal')
    expect(result.percent).toBe(100)
    expect(result.remainingMg).toBeCloseTo(0.4)
  })

  it('TEST-217（境界値）: 目標200mg・今日200.4mgのとき、percentは丸めで100になり得るがstatusはexceeded', () => {
    const result = calculateGoalProgress(200.4, 200)
    expect(result.status).toBe('exceeded')
    expect(result.percent).toBe(100)
    expect(result.overMg).toBeCloseTo(0.4)
  })
})
