import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchGoal, saveGoal } from './appSettings'
import { supabase } from './supabaseClient'

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

function mockFetchResult(result) {
  supabase.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve(result),
      }),
    }),
  })
}

function mockUpdateResult(result) {
  const eq = vi.fn(() => Promise.resolve(result))
  const update = vi.fn(() => ({ eq }))
  supabase.from.mockReturnValue({ update })
  return { update, eq }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('appSettings', () => {
  describe('fetchGoal', () => {
    it('0mgが設定されている場合、NULLと混同せず数値の0を返す', async () => {
      mockFetchResult({ data: { daily_caffeine_goal_mg: 0 }, error: null })

      const goal = await fetchGoal()

      expect(goal).toBe(0)
      expect(goal).not.toBeNull()
    })

    it('数値が設定されている場合、その数値を返す', async () => {
      mockFetchResult({ data: { daily_caffeine_goal_mg: 400 }, error: null })

      const goal = await fetchGoal()

      expect(goal).toBe(400)
    })

    it('未設定(NULL)の場合、nullを返す', async () => {
      mockFetchResult({ data: { daily_caffeine_goal_mg: null }, error: null })

      const goal = await fetchGoal()

      expect(goal).toBeNull()
    })

    it('id=1の行が取得できない場合、アプリ側で補完せずエラーをthrowする', async () => {
      mockFetchResult({ data: null, error: new Error('row not found') })

      await expect(fetchGoal()).rejects.toThrow('row not found')
    })
  })

  describe('saveGoal', () => {
    it('0mgを保存できる（未設定のnullとは区別される）', async () => {
      const { update } = mockUpdateResult({ error: null })

      await saveGoal(0)

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ daily_caffeine_goal_mg: 0 }),
      )
    })

    it('nullを渡すと未設定として保存される', async () => {
      const { update } = mockUpdateResult({ error: null })

      await saveGoal(null)

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ daily_caffeine_goal_mg: null }),
      )
    })

    it('保存時にupdated_atを更新する', async () => {
      const { update } = mockUpdateResult({ error: null })

      await saveGoal(100)

      const [payload] = update.mock.calls[0]
      expect(typeof payload.updated_at).toBe('string')
      expect(Number.isNaN(new Date(payload.updated_at).getTime())).toBe(false)
    })

    it('保存に失敗した場合はエラーをthrowする', async () => {
      mockUpdateResult({ error: new Error('update failed') })

      await expect(saveGoal(100)).rejects.toThrow('update failed')
    })
  })
})
