import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // このMVPはSupabaseからのデータ取得にReact QueryなどのライブラリをMVPで採用せず、
      // useEffect + fetch-on-mount というシンプルな標準パターンを使用する
      // （CLAUDE.md: 不要な依存パッケージ・早すぎる抽象化を避ける）。
      // このルールはそのパターン自体を警告してしまうため無効化する。
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
