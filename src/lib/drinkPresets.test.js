import { describe, it, expect } from 'vitest'
import { DRINK_PRESETS } from './drinkPresets'

describe('DRINK_PRESETS', () => {
  it('TEST-501: 6件のプリセットが、指定された飲み物名・整数のカフェイン量で定義されている', () => {
    expect(DRINK_PRESETS).toEqual([
      { name: 'コーヒー', caffeineMg: 90 },
      { name: '緑茶', caffeineMg: 30 },
      { name: '紅茶', caffeineMg: 30 },
      { name: '烏龍茶', caffeineMg: 20 },
      { name: 'エナジードリンク', caffeineMg: 100 },
      { name: 'コーラ', caffeineMg: 35 },
    ])
  })

  it('すべてのプリセットのカフェイン量が整数である', () => {
    DRINK_PRESETS.forEach((preset) => {
      expect(Number.isInteger(preset.caffeineMg)).toBe(true)
    })
  })
})
