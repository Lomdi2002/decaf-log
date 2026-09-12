import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// globals: true を使わない設定のため、@testing-library/react の自動クリーンアップが
// 効かない。各テスト後に明示的にDOMをクリーンアップし、テスト間のDOM残留を防ぐ。
afterEach(() => {
  cleanup()
})
