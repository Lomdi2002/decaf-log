# Decaf Log

日々のカフェイン摂取量を記録するWebアプリ（Version 1.0 MVP）。

飲み物・カフェイン量・摂取日時を記録し、今日の合計摂取量と履歴を確認できます。

詳しい仕様は [`docs/requirements.md`](docs/requirements.md) と [`docs/screen-design.md`](docs/screen-design.md) を参照してください。

## 実装済み機能（Version 1.0 MVP）

- カフェイン摂取記録の登録（飲み物名・カフェイン量・摂取日時）
- Supabaseへの記録保存
- カフェイン摂取履歴の表示（摂取日時の新しい順）
- カフェイン記録の削除（確認ダイアログあり）
- 今日のカフェイン摂取量合計の表示（ブラウザのローカルタイムゾーン基準）
- 入力バリデーション（飲み物名必須、カフェイン量0以上必須）
- Loading / Error / Empty 状態の表示
- スマートフォン対応のレスポンシブレイアウト

## 未実装機能（Version 1.1以降で検討）

以下はVersion 1.0では未実装です。`docs/requirements.md` §7・§28 を参照してください。

- カフェイン目標設定・進捗プログレスバー
- 摂取量グラフ
- 連続達成日数
- 飲み物プリセット
- 記録編集
- ユーザー認証
- 通知、SNS連携、ダークモードなど
- `/settings` 画面

## 技術スタック

- React / Vite / JavaScript
- React Router
- Supabase（PostgreSQL）
- Vitest / React Testing Library
- GitHub Actions（CI）
- Vercel（デプロイ想定）

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの準備

1. Supabaseプロジェクトを作成する。
2. SQL Editorで [`supabase/schema.sql`](supabase/schema.sql) を実行し、`caffeine_records` テーブルとRLSポリシーを作成する。
3. プロジェクトの URL と anon key を控える。

### 3. 環境変数の設定

`.env.example` を `.env.local` にコピーし、値を設定する。

```bash
cp .env.example .env.local
```

```text
VITE_SUPABASE_URL=あなたのSupabaseプロジェクトURL
VITE_SUPABASE_ANON_KEY=あなたのSupabase anon key
```

`.env.local` はGit管理対象外です（コミットしないでください）。

### 4. 開発サーバー起動

```bash
npm run dev
```

## スクリプト

```bash
npm run dev      # 開発サーバー起動
npm run build    # production build
npm run preview  # buildしたものをプレビュー
npm run lint     # ESLint実行
npm run test     # Vitestでテスト実行
```

## Supabaseのセキュリティに関する重要な注意事項

Version 1.0 MVPには認証機能がありません。そのため、Supabase側では `caffeine_records` テーブルに限定して、
anonロールへ `SELECT` / `INSERT` / `DELETE` を許可するRow Level Security(RLS)ポリシーを設定しています
（詳細は [`supabase/schema.sql`](supabase/schema.sql) を参照）。

**これはMVP・デモ用途に限定した暫定的な構成です。** 認証なしでanonロールに書き込み・削除まで許可しているため、
公開URL（および anon key）を知る誰でもデータを追加・削除できる状態になります。個人利用やデモの範囲では許容していますが、
将来的に一般ユーザー向けに公開する場合は、Supabase Authを導入し、`caffeine_records` に `user_id` カラムを追加した上で
「本人の行のみ操作可能」なRLSポリシーへ変更する必要があります。

## ディレクトリ構成

```text
src/
├── components/   # 再利用可能なUIコンポーネント
├── pages/        # 画面単位のコンポーネント（/, /record, /history）
├── lib/          # Supabaseクライアント、データアクセス、日付ユーティリティ
├── App.jsx
├── App.css
└── main.jsx
supabase/
└── schema.sql    # テーブル定義 + RLSポリシー
```
