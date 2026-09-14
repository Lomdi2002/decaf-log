import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import EditRecordPage from './EditRecordPage'
import { fetchRecordById } from '../lib/caffeineRecords'

vi.mock('../lib/caffeineRecords', () => ({
  fetchRecordById: vi.fn(),
  updateRecord: vi.fn(),
}))

function renderPage(id = 'record-1') {
  return render(
    <MemoryRouter initialEntries={[`/records/${id}/edit`]}>
      <Routes>
        <Route path="/records/:id/edit" element={<EditRecordPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EditRecordPage', () => {
  it('TEST-619: 取得中はLoading状態が表示される', () => {
    fetchRecordById.mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('TEST-620: 取得成功時、EditRecordFormが表示される', async () => {
    fetchRecordById.mockResolvedValueOnce({
      id: 'record-1',
      drinkName: 'コーヒー',
      caffeineMg: 100,
      consumedAt: '2026-09-14T10:00:00+09:00',
      createdAt: '2026-09-14T10:01:00+09:00',
    })

    renderPage()

    expect(await screen.findByLabelText('飲み物')).toHaveValue('コーヒー')
    expect(fetchRecordById).toHaveBeenCalledWith('record-1')
  })

  it('TEST-621: 取得失敗（通信エラー）時、通常のError状態が表示される', async () => {
    fetchRecordById.mockRejectedValueOnce(new Error('network error'))

    renderPage()

    expect(
      await screen.findByText('データの取得に失敗しました。もう一度お試しください。'),
    ).toBeInTheDocument()
  })

  it('TEST-622: 該当レコードなしの場合、通常のErrorとは異なるNot Foundメッセージが表示される', async () => {
    fetchRecordById.mockResolvedValueOnce(null)

    renderPage()

    expect(
      await screen.findByText('指定された記録が見つかりませんでした。'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('データの取得に失敗しました。もう一度お試しください。'),
    ).not.toBeInTheDocument()
  })

  it('TEST-623: Not Found状態で「履歴に戻る」リンクが/historyを指す', async () => {
    fetchRecordById.mockResolvedValueOnce(null)

    renderPage()

    const link = await screen.findByRole('link', { name: '履歴に戻る' })
    expect(link).toHaveAttribute('href', '/history')
  })
})
