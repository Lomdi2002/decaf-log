import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GoalProgress from './GoalProgress'

function renderProgress(props) {
  return render(
    <MemoryRouter>
      <GoalProgress {...props} />
    </MemoryRouter>,
  )
}

describe('GoalProgress', () => {
  it('TEST-208: 目標未設定時、案内メッセージと/settingsへのリンクが表示される', () => {
    renderProgress({ todayTotalMg: 0, goalMg: null })

    expect(screen.getByText('1日の目標が設定されていません。')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: '目標を設定する' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/settings')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('TEST-209: 通常時、今日の摂取量・目標値・進捗率・残り摂取可能量が表示される', () => {
    renderProgress({ todayTotalMg: 100, goalMg: 200 })

    expect(screen.getByText('今日 100mg')).toBeInTheDocument()
    expect(screen.getByText('目標 200mg')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('あと100mg')).toBeInTheDocument()
  })

  it('TEST-210: 目標到達時、「目標上限に達しました」が表示される', () => {
    renderProgress({ todayTotalMg: 200, goalMg: 200 })

    expect(screen.getByText('目標上限に達しました')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('TEST-211: 目標超過時、実際の進捗率と超過量が表示され、警告表示になる', () => {
    const { container } = renderProgress({ todayTotalMg: 250, goalMg: 200 })

    expect(screen.getByText('125%')).toBeInTheDocument()
    expect(screen.getByText('目標を50mg超えています')).toBeInTheDocument()
    expect(container.querySelector('.goal-progress-warning')).not.toBeNull()
  })

  it('TEST-212: 目標0mg・今日0mgのとき「カフェイン摂取なし」相当の表示になり、%は表示されない', () => {
    renderProgress({ todayTotalMg: 0, goalMg: 0 })

    expect(screen.getByText('カフェイン摂取なし')).toBeInTheDocument()
    expect(screen.getByText('目標内')).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('TEST-213: 目標0mg・今日1mg以上のとき「目標を超えています」の表示になり、%は表示されない', () => {
    renderProgress({ todayTotalMg: 5, goalMg: 0 })

    expect(screen.getByText('目標を超えています')).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('TEST-218: 進捗バーにprogressbarロールとaria属性が付与される', () => {
    renderProgress({ todayTotalMg: 250, goalMg: 200 })

    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    // 125%でもバーの視覚的な幅(aria-valuenow)は100で頭打ちにする
    expect(bar).toHaveAttribute('aria-valuenow', '100')
  })

  it('境界値: 199.6mg/200mgはnormal表示（「目標上限に達しました」は表示されない）', () => {
    renderProgress({ todayTotalMg: 199.6, goalMg: 200 })

    expect(screen.queryByText('目標上限に達しました')).not.toBeInTheDocument()
    expect(screen.getByText(/あと0\.4/)).toBeInTheDocument()
  })

  it('境界値: 200.4mg/200mgはexceeded表示（超過文言が表示される）', () => {
    renderProgress({ todayTotalMg: 200.4, goalMg: 200 })

    expect(screen.getByText(/目標を0\.4mg超えています/)).toBeInTheDocument()
  })
})
