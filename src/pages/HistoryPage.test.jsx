import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import HistoryPage from './HistoryPage'
import { fetchRecords, deleteRecord } from '../lib/caffeineRecords'

vi.mock('../lib/caffeineRecords', () => ({
  fetchRecords: vi.fn(),
  deleteRecord: vi.fn(),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('HistoryPage', () => {
  it('TEST-008: 履歴が表示される（新しい順で渡された配列をそのまま表示する）', async () => {
    fetchRecords.mockResolvedValueOnce([
      { id: '1', drinkName: 'コーヒー', caffeineMg: 100, consumedAt: '2026-09-12T10:00:00+09:00' },
      { id: '2', drinkName: '緑茶', caffeineMg: 30, consumedAt: '2026-09-12T09:00:00+09:00' },
    ])

    renderPage()

    expect(await screen.findByText('コーヒー')).toBeInTheDocument()
    expect(screen.getByText('緑茶')).toBeInTheDocument()
  })

  it('読み込み中はローディング表示になる', () => {
    fetchRecords.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('取得失敗時はエラーメッセージを表示する', async () => {
    fetchRecords.mockRejectedValueOnce(new Error('network error'))
    renderPage()
    expect(
      await screen.findByText('データの取得に失敗しました。もう一度お試しください。'),
    ).toBeInTheDocument()
  })

  it('記録がない場合はEmpty状態を表示する', async () => {
    fetchRecords.mockResolvedValueOnce([])
    renderPage()
    expect(await screen.findByText(/まだ記録がありません。/)).toBeInTheDocument()
  })

  it('TEST-009: 削除処理を実行できる', async () => {
    fetchRecords.mockResolvedValueOnce([
      { id: '1', drinkName: 'コーヒー', caffeineMg: 100, consumedAt: '2026-09-12T10:00:00+09:00' },
    ])
    deleteRecord.mockResolvedValueOnce(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('コーヒー')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '削除' }))

    await waitFor(() => {
      expect(deleteRecord).toHaveBeenCalledWith('1')
    })
    await waitFor(() => {
      expect(screen.queryByText('コーヒー')).not.toBeInTheDocument()
    })
  })

  it('削除確認でキャンセルした場合は削除されない', async () => {
    fetchRecords.mockResolvedValueOnce([
      { id: '1', drinkName: 'コーヒー', caffeineMg: 100, consumedAt: '2026-09-12T10:00:00+09:00' },
    ])
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('コーヒー')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '削除' }))

    expect(deleteRecord).not.toHaveBeenCalled()
    expect(screen.getByText('コーヒー')).toBeInTheDocument()
  })

  it('削除失敗時はエラーメッセージを表示し記録を残す', async () => {
    fetchRecords.mockResolvedValueOnce([
      { id: '1', drinkName: 'コーヒー', caffeineMg: 100, consumedAt: '2026-09-12T10:00:00+09:00' },
    ])
    deleteRecord.mockRejectedValueOnce(new Error('network error'))
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('コーヒー')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '削除' }))

    expect(
      await screen.findByText('記録の削除に失敗しました。もう一度お試しください。'),
    ).toBeInTheDocument()
    expect(screen.getByText('コーヒー')).toBeInTheDocument()
  })
})
