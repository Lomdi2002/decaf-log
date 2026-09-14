import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import EditRecordForm from './EditRecordForm'
import { updateRecord } from '../lib/caffeineRecords'

vi.mock('../lib/caffeineRecords', () => ({
  updateRecord: vi.fn(),
}))

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const RECORD = {
  id: 'record-1',
  drinkName: 'コーヒー',
  caffeineMg: 100,
  consumedAt: '2026-09-14T10:00:00+09:00',
  createdAt: '2026-09-14T10:01:00+09:00',
}

function renderForm(record = RECORD) {
  return render(
    <MemoryRouter>
      <EditRecordForm record={record} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EditRecordForm', () => {
  it('TEST-612: 対象記録の値が初期値として正しく表示される（摂取日時はローカルタイムゾーン）', () => {
    renderForm()

    expect(screen.getByLabelText('飲み物')).toHaveValue('コーヒー')
    expect(screen.getByLabelText('カフェイン量')).toHaveValue(100)
    // テスト実行タイムゾーンは Asia/Tokyo (vite.config.js の test.env.TZ) に固定している。
    expect(screen.getByLabelText('摂取日時')).toHaveValue('2026-09-14T10:00')
  })

  it('TEST-613: 値を変更して保存すると、updateRecordが正しい引数で呼ばれる', async () => {
    updateRecord.mockResolvedValueOnce({ id: 'record-1' })
    const user = userEvent.setup()
    renderForm()

    await user.clear(screen.getByLabelText('飲み物'))
    await user.type(screen.getByLabelText('飲み物'), '緑茶')
    await user.clear(screen.getByLabelText('カフェイン量'))
    await user.type(screen.getByLabelText('カフェイン量'), '30')
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(updateRecord).toHaveBeenCalledWith(
        'record-1',
        expect.objectContaining({ drinkName: '緑茶', caffeineMg: 30 }),
      )
    })
  })

  it('TEST-614: 保存成功後、/historyへ遷移する', async () => {
    updateRecord.mockResolvedValueOnce({ id: 'record-1' })
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/history')
    })
  })

  it('TEST-615: バリデーションエラー時（飲み物未入力）は保存されない', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.clear(screen.getByLabelText('飲み物'))
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(await screen.findByText('飲み物を入力してください。')).toBeInTheDocument()
    expect(updateRecord).not.toHaveBeenCalled()
  })

  it('TEST-616: キャンセルすると/historyへ遷移し、updateRecordは呼ばれない', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(mockNavigate).toHaveBeenCalledWith('/history')
    expect(updateRecord).not.toHaveBeenCalled()
  })

  it('TEST-617: 保存中は入力欄・ボタンが無効化される', async () => {
    updateRecord.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(await screen.findByRole('button', { name: '保存中...' })).toBeInTheDocument()
    expect(screen.getByLabelText('飲み物')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled()
  })

  it('TEST-618: 保存失敗時はエラーメッセージが表示され、入力内容が保持される', async () => {
    updateRecord.mockRejectedValueOnce(new Error('network error'))
    const user = userEvent.setup()
    renderForm()

    await user.clear(screen.getByLabelText('飲み物'))
    await user.type(screen.getByLabelText('飲み物'), '紅茶')
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(
      await screen.findByText('記録の更新に失敗しました。もう一度お試しください。'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('飲み物')).toHaveValue('紅茶')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
