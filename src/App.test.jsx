import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App routing', () => {
  it('TEST-001: アプリタイトルが表示される', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Decaf Log' })).toBeInTheDocument()
  })

  it('/record で記録画面が表示される', () => {
    renderAt('/record')
    expect(screen.getByRole('heading', { name: 'カフェインを記録' })).toBeInTheDocument()
  })

  it('/history で履歴画面が表示される', () => {
    renderAt('/history')
    expect(screen.getByRole('heading', { name: '摂取履歴' })).toBeInTheDocument()
  })

  it('ボトムナビゲーションに主要3項目が表示される', () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: 'ホーム' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '記録' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '履歴' })).toBeInTheDocument()
  })
})
