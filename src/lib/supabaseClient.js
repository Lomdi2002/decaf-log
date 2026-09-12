import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // 開発者向けのログのみ。一般ユーザー向けのエラー表示はUI側で行う。
  console.error(
    'Supabaseの環境変数が設定されていません。.env.local に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。',
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
