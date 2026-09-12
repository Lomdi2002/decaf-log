import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RecordForm from './RecordForm'
import { insertRecord } from '../lib/caffeineRecords'

vi.mock('../lib/caffeineRecords', () => ({
  insertRecord: vi.fn(),
}))

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderForm() {
  return render(
    <MemoryRouter>
      <RecordForm />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RecordForm', () => {
  it('TEST-002: フォームへ飲み物名とカフェイン量を入力できる', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('飲み物'), 'コーヒー')
    await user.type(screen.getByLabelText('カフェイン量'), '100')

    expect(screen.getByLabelText('飲み物')).toHaveValue('コーヒー')
    expect(screen.getByLabelText('カフェイン量')).toHaveValue(100)
  })

  it('TEST-003: 正常な入力から登録処理を実行できる', async () => {
    insertRecord.mockResolvedValueOnce({ id: 'test-id' })
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('飲み物'), 'コーヒー')
    await user.type(screen.getByLabelText('カフェイン量'), '100')
    await user.click(screen.getByRole('button', { name: '登録' }))

    await waitFor(() => {
      expect(insertRecord).toHaveBeenCalledWith(
        expect.objectContaining({ drinkName: 'コーヒー', caffeineMg: 100 }),
      )
    })
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('TEST-004: 飲み物未入力でエラーになる', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('カフェイン量'), '100')
    await user.click(screen.getByRole('button', { name: '登録' }))

    expect(await screen.findByText('飲み物を入力してください。')).toBeInTheDocument()
    expect(insertRecord).not.toHaveBeenCalled()
  })

  it('TEST-005: カフェイン量未入力でエラーになる', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('飲み物'), 'コーヒー')
    await user.click(screen.getByRole('button', { name: '登録' }))

    expect(await screen.findByText('カフェイン量を入力してください。')).toBeInTheDocument()
    expect(insertRecord).not.toHaveBeenCalled()
  })

  it('TEST-006: 負のカフェイン量でエラーになる', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('飲み物'), 'コーヒー')
    await user.type(screen.getByLabelText('カフェイン量'), '-5')
    await user.click(screen.getByRole('button', { name: '登録' }))

    expect(await screen.findByText('0以上の数値を入力してください。')).toBeInTheDocument()
    expect(insertRecord).not.toHaveBeenCalled()
  })

  it('登録失敗時はエラーメッセージを表示し入力内容を保持する', async () => {
    insertRecord.mockRejectedValueOnce(new Error('network error'))
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('飲み物'), 'コーヒー')
    await user.type(screen.getByLabelText('カフェイン量'), '100')
    await user.click(screen.getByRole('button', { name: '登録' }))

    expect(
      await screen.findByText('記録の登録に失敗しました。もう一度お試しください。'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('飲み物')).toHaveValue('コーヒー')
    expect(screen.getByLabelText('カフェイン量')).toHaveValue(100)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  describe('飲み物プリセット（Version 1.5）', () => {
    it('TEST-506: プリセットボタンを押すと、飲み物・カフェイン量欄に対応する値がセットされる', async () => {
      const user = userEvent.setup()
      renderForm()

      await user.click(screen.getByRole('button', { name: 'コーヒー（90mg）' }))

      expect(screen.getByLabelText('飲み物')).toHaveValue('コーヒー')
      expect(screen.getByLabelText('カフェイン量')).toHaveValue(90)
    })

    it('TEST-507: プリセット選択後も、飲み物・カフェイン量を手動で編集できる', async () => {
      const user = userEvent.setup()
      renderForm()

      await user.click(screen.getByRole('button', { name: '緑茶（30mg）' }))
      await user.clear(screen.getByLabelText('カフェイン量'))
      await user.type(screen.getByLabelText('カフェイン量'), '25')

      expect(screen.getByLabelText('飲み物')).toHaveValue('緑茶')
      expect(screen.getByLabelText('カフェイン量')).toHaveValue(25)
    })

    it('TEST-508: 複数のプリセットを連続で選択した場合、最後に選んだ値が反映される', async () => {
      const user = userEvent.setup()
      renderForm()

      await user.click(screen.getByRole('button', { name: 'コーヒー（90mg）' }))
      await user.click(screen.getByRole('button', { name: 'コーラ（35mg）' }))

      expect(screen.getByLabelText('飲み物')).toHaveValue('コーラ')
      expect(screen.getByLabelText('カフェイン量')).toHaveValue(35)
    })

    it('TEST-509: プリセットを使わず、従来通り手入力のみで登録できる', async () => {
      insertRecord.mockResolvedValueOnce({ id: 'test-id' })
      const user = userEvent.setup()
      renderForm()

      await user.type(screen.getByLabelText('飲み物'), '手入れコーヒー')
      await user.type(screen.getByLabelText('カフェイン量'), '120')
      await user.click(screen.getByRole('button', { name: '登録' }))

      await waitFor(() => {
        expect(insertRecord).toHaveBeenCalledWith(
          expect.objectContaining({ drinkName: '手入れコーヒー', caffeineMg: 120 }),
        )
      })
    })

    it('TEST-510: プリセット選択後に送信すると、正しい飲み物・カフェイン量でinsertRecordが呼ばれる', async () => {
      insertRecord.mockResolvedValueOnce({ id: 'test-id' })
      const user = userEvent.setup()
      renderForm()

      await user.click(screen.getByRole('button', { name: 'エナジードリンク（100mg）' }))
      await user.click(screen.getByRole('button', { name: '登録' }))

      await waitFor(() => {
        expect(insertRecord).toHaveBeenCalledWith(
          expect.objectContaining({ drinkName: 'エナジードリンク', caffeineMg: 100 }),
        )
      })
    })

    it('目安である旨の注意書きが表示される', () => {
      renderForm()

      expect(
        screen.getByText('※カフェイン量は目安です。選択後に変更できます。'),
      ).toBeInTheDocument()
    })

    it('TEST-511: 登録処理中は、既存の入力欄と同様にプリセットボタンも無効化される', async () => {
      insertRecord.mockReturnValue(new Promise(() => {}))
      const user = userEvent.setup()
      renderForm()

      await user.type(screen.getByLabelText('飲み物'), 'コーヒー')
      await user.type(screen.getByLabelText('カフェイン量'), '100')
      await user.click(screen.getByRole('button', { name: '登録' }))

      expect(await screen.findByRole('button', { name: '登録中...' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'コーヒー（90mg）' })).toBeDisabled()
    })
  })
})
