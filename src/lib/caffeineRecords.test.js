import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchRecordById, updateRecord } from './caffeineRecords'
import { supabase } from './supabaseClient'

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

function mockFetchByIdResult(result) {
  supabase.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve(result),
      }),
    }),
  })
}

function mockUpdateResult(result) {
  const eq = vi.fn(() => ({ select: () => ({ single: () => Promise.resolve(result) }) }))
  const update = vi.fn(() => ({ eq }))
  supabase.from.mockReturnValue({ update })
  return { update, eq }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchRecordById', () => {
  it('TEST-607: 該当レコードをcamelCase変換して返す', async () => {
    mockFetchByIdResult({
      data: {
        id: 'record-1',
        drink_name: 'コーヒー',
        caffeine_mg: 100,
        consumed_at: '2026-09-14T10:00:00+09:00',
        created_at: '2026-09-14T10:01:00+09:00',
      },
      error: null,
    })

    const record = await fetchRecordById('record-1')

    expect(record).toEqual({
      id: 'record-1',
      drinkName: 'コーヒー',
      caffeineMg: 100,
      consumedAt: '2026-09-14T10:00:00+09:00',
      createdAt: '2026-09-14T10:01:00+09:00',
    })
  })

  it('TEST-608: 該当レコードなしの場合nullを返す（maybeSingle利用）', async () => {
    mockFetchByIdResult({ data: null, error: null })

    const record = await fetchRecordById('not-exist')

    expect(record).toBeNull()
  })

  it('TEST-609: 通信・取得エラー時はエラーをthrowする', async () => {
    mockFetchByIdResult({ data: null, error: new Error('network error') })

    await expect(fetchRecordById('record-1')).rejects.toThrow('network error')
  })
})

describe('updateRecord', () => {
  it('TEST-610: 正しいpayload（drink_name, caffeine_mg, consumed_at）でupdateを呼び出す', async () => {
    const { update, eq } = mockUpdateResult({
      data: {
        id: 'record-1',
        drink_name: '緑茶',
        caffeine_mg: 30,
        consumed_at: '2026-09-14T09:00:00+09:00',
        created_at: '2026-09-14T09:01:00+09:00',
      },
      error: null,
    })

    const record = await updateRecord('record-1', {
      drinkName: '緑茶',
      caffeineMg: 30,
      consumedAt: '2026-09-14T09:00:00+09:00',
    })

    expect(update).toHaveBeenCalledWith({
      drink_name: '緑茶',
      caffeine_mg: 30,
      consumed_at: '2026-09-14T09:00:00+09:00',
    })
    expect(eq).toHaveBeenCalledWith('id', 'record-1')
    expect(record.drinkName).toBe('緑茶')
  })

  it('updateのpayloadにid・created_atを含めない', async () => {
    const { update } = mockUpdateResult({
      data: {
        id: 'record-1',
        drink_name: '紅茶',
        caffeine_mg: 30,
        consumed_at: '2026-09-14T09:00:00+09:00',
        created_at: '2026-09-14T09:01:00+09:00',
      },
      error: null,
    })

    await updateRecord('record-1', {
      drinkName: '紅茶',
      caffeineMg: 30,
      consumedAt: '2026-09-14T09:00:00+09:00',
    })

    const [payload] = update.mock.calls[0]
    expect(payload).not.toHaveProperty('id')
    expect(payload).not.toHaveProperty('created_at')
  })

  it('TEST-611: エラー時はエラーをthrowする', async () => {
    mockUpdateResult({ data: null, error: new Error('update failed') })

    await expect(
      updateRecord('record-1', { drinkName: 'コーヒー', caffeineMg: 100, consumedAt: '2026-09-14T09:00:00+09:00' }),
    ).rejects.toThrow('update failed')
  })
})
