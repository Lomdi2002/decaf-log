import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StreakCard from './StreakCard'

function renderCard(streak) {
  return render(
    <MemoryRouter>
      <StreakCard streak={streak} />
    </MemoryRouter>,
  )
}

describe('StreakCard', () => {
  it('TEST-412: 目標未設定時、案内メッセージと/settingsへのリンクが表示される', () => {
    renderCard({ status: 'unset' })

    expect(screen.getByText('連続達成')).toBeInTheDocument()
    expect(screen.getByText('目標を設定すると連続達成日数を確認できます。')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: '目標を設定する' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/settings')
  })

  it('TEST-413: 連続達成日数が0日の場合、特別な文言なしに「連続達成 / 0日」が表示される', () => {
    renderCard({ status: 'counted', days: 0 })

    expect(screen.getByText('連続達成')).toBeInTheDocument()
    expect(screen.getByText('0日')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('TEST-414: 連続達成日数が1日以上の場合、「連続達成 / ◯日」が正しく表示される', () => {
    renderCard({ status: 'counted', days: 5 })

    expect(screen.getByText('連続達成')).toBeInTheDocument()
    expect(screen.getByText('5日')).toBeInTheDocument()
  })
})
