import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from './DashboardPage'
import { fetchRecords } from '../lib/caffeineRecords'
import { fetchGoal } from '../lib/appSettings'

vi.mock('../lib/caffeineRecords', () => ({
  fetchRecords: vi.fn(),
}))

vi.mock('../lib/appSettings', () => ({
  fetchGoal: vi.fn(),
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
  // 明示的にモックしていないテストでは、目標取得は「未設定」を返すものとする。
  fetchGoal.mockResolvedValue(null)
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

  describe('目標進捗（Version 1.2）', () => {
    it('TEST-219: 記録取得が完了し目標取得がまだの間は、合計・最近の記録を表示しつつ目標進捗部分のみ読み込み中になる', async () => {
      fetchRecords.mockResolvedValueOnce([])
      fetchGoal.mockReturnValue(new Promise(() => {}))

      renderPage()

      expect(await screen.findByText('0 mg')).toBeInTheDocument()
      // ページ全体のLoading（最初の一瞬）は既に終わっているはずなので、
      // ここで見えている「読み込み中...」は目標進捗部分のものである。
      expect(screen.getByText('読み込み中...')).toBeInTheDocument()
    })

    it('目標未設定時、進捗バーの代わりに案内メッセージと/settings導線を表示する', async () => {
      fetchRecords.mockResolvedValueOnce([])
      fetchGoal.mockResolvedValueOnce(null)

      renderPage()

      expect(await screen.findByText('1日の目標が設定されていません。')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '目標を設定する' })).toBeInTheDocument()
    })

    it('目標設定済みの場合、今日の合計をもとにした進捗が表示される', async () => {
      const now = new Date()
      fetchRecords.mockResolvedValueOnce([
        { id: '1', drinkName: 'コーヒー', caffeineMg: 100, consumedAt: now.toISOString() },
      ])
      fetchGoal.mockResolvedValueOnce(200)

      renderPage()

      expect(await screen.findByText('今日 100mg')).toBeInTheDocument()
      expect(screen.getByText('目標 200mg')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('TEST-214: 目標取得に失敗しても、今日の合計・最近の記録は通常どおり表示される', async () => {
      const now = new Date()
      fetchRecords.mockResolvedValueOnce([
        { id: '1', drinkName: 'コーヒー', caffeineMg: 100, consumedAt: now.toISOString() },
      ])
      fetchGoal.mockRejectedValueOnce(new Error('network error'))

      renderPage()

      expect(await screen.findByText('100 mg')).toBeInTheDocument()
      expect(screen.getByText('コーヒー')).toBeInTheDocument()
      expect(screen.getByText('目標を取得できませんでした。')).toBeInTheDocument()
    })

    it('TEST-215: 記録取得に失敗した場合は、従来通りダッシュボード全体がError状態になる', async () => {
      fetchRecords.mockRejectedValueOnce(new Error('network error'))
      fetchGoal.mockResolvedValueOnce(200)

      renderPage()

      expect(
        await screen.findByText('データの取得に失敗しました。もう一度お試しください。'),
      ).toBeInTheDocument()
      expect(screen.queryByText('目標 200mg')).not.toBeInTheDocument()
    })
  })
})
