import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    env: {
      // タイムゾーン依存のロジック（今日の判定など）をCI環境に関わらず
      // 決定的にテストするため、UTCとは異なる固定タイムゾーンを指定する。
      TZ: 'Asia/Tokyo',
      // supabaseClient.js の初期化を通すためのダミー値。
      // テストはSupabaseへ実接続しないため、実際の値は不要。
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
