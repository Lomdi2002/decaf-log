import { describe, it, expect } from 'vitest'
import { validateRecordInput } from './recordValidation'

const VALID_INPUT = {
  drinkName: 'コーヒー',
  caffeineMg: '100',
  consumedAt: '2026-09-14T10:00',
}

describe('validateRecordInput', () => {
  it('TEST-601: 飲み物が空欄（空白のみ含む）の場合エラーになる', () => {
    const errors = validateRecordInput({ ...VALID_INPUT, drinkName: '   ' })
    expect(errors.drinkName).toBe('飲み物を入力してください。')
  })

  it('TEST-602: カフェイン量が未入力の場合エラーになる', () => {
    const errors = validateRecordInput({ ...VALID_INPUT, caffeineMg: '' })
    expect(errors.caffeineMg).toBe('カフェイン量を入力してください。')
  })

  it('TEST-603: カフェイン量が負数の場合エラーになる', () => {
    const errors = validateRecordInput({ ...VALID_INPUT, caffeineMg: '-5' })
    expect(errors.caffeineMg).toBe('0以上の数値を入力してください。')
  })

  it('TEST-604: カフェイン量が数値として扱えない場合エラーになる', () => {
    const errors = validateRecordInput({ ...VALID_INPUT, caffeineMg: 'abc' })
    expect(errors.caffeineMg).toBe('0以上の数値を入力してください。')
  })

  it('TEST-605: 摂取日時が未入力・不正な日時の場合エラーになる', () => {
    expect(validateRecordInput({ ...VALID_INPUT, consumedAt: '' }).consumedAt).toBe(
      '摂取日時を入力してください。',
    )
    expect(validateRecordInput({ ...VALID_INPUT, consumedAt: 'invalid' }).consumedAt).toBe(
      '摂取日時を入力してください。',
    )
  })

  it('TEST-606: すべて正しい入力の場合エラーが発生しない', () => {
    expect(validateRecordInput(VALID_INPUT)).toEqual({})
  })
})
