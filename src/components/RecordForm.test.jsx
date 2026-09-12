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
})
