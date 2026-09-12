import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from './DashboardPage'
import { fetchRecords } from '../lib/caffeineRecords'

vi.mock('../lib/caffeineRecords', () => ({
  fetchRecords: vi.fn(),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DashboardPage', () => {
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

  it('記録がない場合はEmpty状態と0mgを表示する', async () => {
    fetchRecords.mockResolvedValueOnce([])
    renderPage()
    expect(await screen.findByText('0 mg')).toBeInTheDocument()
    expect(screen.getByText(/今日はまだ記録がありません。/)).toBeInTheDocument()
  })

  it('TEST-007: 今日の記録の合計カフェイン量が正しく計算される (100 + 30 = 130)', async () => {
    const now = new Date()
    fetchRecords.mockResolvedValueOnce([
      { id: '1', drinkName: 'コーヒー', caffeineMg: 100, consumedAt: now.toISOString() },
      { id: '2', drinkName: '緑茶', caffeineMg: 30, consumedAt: now.toISOString() },
      // 今日ではない記録は合計に含まれない
      { id: '3', drinkName: 'コーヒー', caffeineMg: 200, consumedAt: '2000-01-01T00:00:00Z' },
    ])

    renderPage()

    expect(await screen.findByText('130 mg')).toBeInTheDocument()
  })

  it('最近の記録は最大3件まで表示し、「すべて見る」リンクを表示する', async () => {
    const now = new Date()
    fetchRecords.mockResolvedValueOnce([
      { id: '1', drinkName: 'A', caffeineMg: 10, consumedAt: now.toISOString() },
      { id: '2', drinkName: 'B', caffeineMg: 10, consumedAt: now.toISOString() },
      { id: '3', drinkName: 'C', caffeineMg: 10, consumedAt: now.toISOString() },
      { id: '4', drinkName: 'D', caffeineMg: 10, consumedAt: now.toISOString() },
    ])

    renderPage()

    expect(await screen.findByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.queryByText('D')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'すべて見る' })).toBeInTheDocument()
  })
})
