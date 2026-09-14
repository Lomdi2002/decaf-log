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

// Version 1.3: DailyChart（Recharts）は実描画に依存させず、渡されたdataのみを
// 検証できる軽量なダミーコンポーネントに差し替える。
vi.mock('../components/DailyChart', () => ({
  default: ({ data }) => <div data-testid="daily-chart" data-count={data.length} />,
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

  it('読み込み中はローディング表示になる（グラフは表示されない）', () => {
    fetchRecords.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
    expect(screen.queryByTestId('daily-chart')).not.toBeInTheDocument()
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

  it('TEST-310・TEST-311: 記録がある場合、日別グラフ（7日分）と記録一覧の両方が表示される', async () => {
    fetchRecords.mockResolvedValueOnce([
      { id: '1', drinkName: 'コーヒー', caffeineMg: 100, consumedAt: '2026-09-12T10:00:00+09:00' },
    ])

    renderPage()

    expect(await screen.findByText('コーヒー')).toBeInTheDocument()
    const chart = screen.getByTestId('daily-chart')
    expect(chart).toBeInTheDocument()
    expect(chart).toHaveAttribute('data-count', '7')
  })

  it('TEST-312: 記録が1件もない場合でも、7日分のグラフとEmpty状態がともに表示される', async () => {
    fetchRecords.mockResolvedValueOnce([])

    renderPage()

    expect(await screen.findByText(/まだ記録がありません。/)).toBeInTheDocument()
    const chart = screen.getByTestId('daily-chart')
    expect(chart).toBeInTheDocument()
    expect(chart).toHaveAttribute('data-count', '7')
  })

  it('TEST-313: 取得失敗時はグラフを表示しない（既存のError状態のみ表示する）', async () => {
    fetchRecords.mockRejectedValueOnce(new Error('network error'))

    renderPage()

    expect(
      await screen.findByText('データの取得に失敗しました。もう一度お試しください。'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('daily-chart')).not.toBeInTheDocument()
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

  it('TEST-624: 記録ごとに「編集」リンクが表示され、/records/:id/editを指す（Version 1.6）', async () => {
    fetchRecords.mockResolvedValueOnce([
      { id: '1', drinkName: 'コーヒー', caffeineMg: 100, consumedAt: '2026-09-12T10:00:00+09:00' },
    ])

    renderPage()

    expect(await screen.findByText('コーヒー')).toBeInTheDocument()
    const editLink = screen.getByRole('link', { name: '編集' })
    expect(editLink).toHaveAttribute('href', '/records/1/edit')
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
