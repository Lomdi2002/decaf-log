import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import SettingsPage from './SettingsPage'
import { fetchGoal } from '../lib/appSettings'

vi.mock('../lib/appSettings', () => ({
  fetchGoal: vi.fn(),
  saveGoal: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SettingsPage', () => {
  it('TEST-101: 設定画面の見出しが表示される', async () => {
    fetchGoal.mockResolvedValueOnce(null)
    render(<SettingsPage />)

    expect(screen.getByRole('heading', { name: '設定' })).toBeInTheDocument()
    await screen.findByLabelText('1日のカフェイン目標')
  })

  it('TEST-111: 読み込み中はLoading状態が表示される', () => {
    fetchGoal.mockReturnValue(new Promise(() => {}))
    render(<SettingsPage />)

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('TEST-110: 取得失敗時はエラーメッセージが表示される', async () => {
    fetchGoal.mockRejectedValueOnce(new Error('network error'))
    render(<SettingsPage />)

    expect(
      await screen.findByText('データの取得に失敗しました。もう一度お試しください。'),
    ).toBeInTheDocument()
  })

  it('TEST-102: 保存済みの目標値(400mg)が入力欄に表示される', async () => {
    fetchGoal.mockResolvedValueOnce(400)
    render(<SettingsPage />)

    expect(await screen.findByLabelText('1日のカフェイン目標')).toHaveValue('400')
  })

  it('TEST-103: 未設定(null)の場合は入力欄が空欄で表示される', async () => {
    fetchGoal.mockResolvedValueOnce(null)
    render(<SettingsPage />)

    expect(await screen.findByLabelText('1日のカフェイン目標')).toHaveValue('')
  })

  it('0mg(設定済み)の場合、未設定と混同せず入力欄に0を表示する', async () => {
    fetchGoal.mockResolvedValueOnce(0)
    render(<SettingsPage />)

    expect(await screen.findByLabelText('1日のカフェイン目標')).toHaveValue('0')
  })
})
