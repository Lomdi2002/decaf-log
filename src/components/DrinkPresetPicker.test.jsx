import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DrinkPresetPicker from './DrinkPresetPicker'

describe('DrinkPresetPicker', () => {
  it('TEST-502: 6件のプリセットボタンが表示される', () => {
    render(<DrinkPresetPicker onSelect={() => {}} />)

    expect(screen.getByRole('button', { name: 'コーヒー（90mg）' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '緑茶（30mg）' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '紅茶（30mg）' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '烏龍茶（20mg）' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'エナジードリンク（100mg）' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'コーラ（35mg）' })).toBeInTheDocument()
  })

  it('TEST-503: 目安である旨の注意書きが表示される', () => {
    render(<DrinkPresetPicker onSelect={() => {}} />)

    expect(
      screen.getByText('※カフェイン量は目安です。選択後に変更できます。'),
    ).toBeInTheDocument()
  })

  it('TEST-504: プリセットボタンを押すと、onSelectが正しいプリセットを引数に呼ばれる', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<DrinkPresetPicker onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: 'コーヒー（90mg）' }))

    expect(onSelect).toHaveBeenCalledWith({ name: 'コーヒー', caffeineMg: 90 })
  })

  it('TEST-505: disabledがtrueのとき、すべてのプリセットボタンが無効化される', () => {
    render(<DrinkPresetPicker onSelect={() => {}} disabled />)

    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
    buttons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })
})
