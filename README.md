# Decaf Log

日々のカフェイン摂取量を記録し、1日のカフェイン目標を設定できるWebアプリ（Version 1.1）。

飲み物・カフェイン量・摂取日時を記録し、今日の合計摂取量と履歴を確認できます。また、1日のカフェイン目標値を設定できます。

詳しい仕様は [`docs/requirements.md`](docs/requirements.md) と [`docs/screen-design.md`](docs/screen-design.md) を参照してください。

## 実装済み機能

### Version 1.0 MVP

- カフェイン摂取記録の登録（飲み物名・カフェイン量・摂取日時）
- Supabaseへの記録保存
- カフェイン摂取履歴の表示（摂取日時の新しい順）
- カフェイン記録の削除（確認ダイアログあり）
- 今日のカフェイン摂取量合計の表示（ブラウザのローカルタイムゾーン基準）
- 入力バリデーション（飲み物名必須、カフェイン量0以上必須）
- Loading / Error / Empty 状態の表示
- スマートフォン対応のレスポンシブレイアウト

### Version 1.1

- `/settings` 画面（1日のカフェイン目標値の設定）
- 目標値（mg）の入力・保存・表示（0以上の数値、または「未設定」）
- 入力欄を空にして保存すると「未設定」に戻せる
- 保存成功時は `/settings` に留まり「保存しました。」を表示（入力変更または次回保存時にクリア）
- Bottom Navigationへ「設定」を追加（4項目：ホーム／記録／履歴／設定）
- ダッシュボードへの目標値表示・進捗表示は行わない（Version 1.2以降で検討）

## 未実装機能（Version 1.2以降で検討）

以下は現時点では未実装です。`docs/requirements.md` §7・§28 を参照してください。

- 目標進捗プログレスバー
- 摂取量グラフ
- 連続達成日数
- 飲み物プリセット
- 記録編集
- ユーザー認証
- 通知、SNS連携、ダークモードなど

## 技術スタック

- React / Vite / JavaScript
- React Router
- Supabase（PostgreSQL）
- Vitest / React Testing Library
- GitHub Actions（CI）
- Vercel（本番デプロイ済み）

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの準備

1. Supabaseプロジェクトを作成する。
2. SQL Editorで [`supabase/schema.sql`](supabase/schema.sql) を実行し、`caffeine_records` と `app_settings` のテーブル・RLSポリシーを作成する（新規プロジェクトの場合はこのファイル1つで完成形になる。既存プロジェクトへVersion 1.1のみ追加する場合は [`supabase/migrations/`](supabase/migrations/) 配下の該当migrationのみ実行してもよい）。
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

このアプリには認証機能がありません。そのため、Supabase側ではテーブルごとに必要最小限の権限のみをanonロールへ付与しています
（詳細は [`supabase/schema.sql`](supabase/schema.sql) を参照）。

- `caffeine_records`：anonロールへ `SELECT` / `INSERT` / `DELETE` を許可
- `app_settings`（Version 1.1）：anonロールへ `SELECT` / `UPDATE` のみ許可（`INSERT` / `DELETE` は不許可）。常に `id = 1` の1行のみで運用する単一設定テーブルで、初期行はmigration適用時に作成済みのため、アプリからの行追加・削除は行わない

**これはMVP・デモ用途に限定した暫定的な構成です。** 特に `caffeine_records` は認証なしでanonロールに書き込み・削除まで許可しているため、
公開URL（および anon key）を知る誰でもデータを追加・削除できる状態になります。個人利用やデモの範囲では許容していますが、
将来的に一般ユーザー向けに公開する場合は、Supabase Authを導入し、`caffeine_records` に `user_id` カラムを追加した上で
「本人の行のみ操作可能」なRLSポリシーへ変更する必要があります。

## ディレクトリ構成

```text
src/
├── components/   # 再利用可能なUIコンポーネント
├── pages/        # 画面単位のコンポーネント（/, /record, /history, /settings）
├── lib/          # Supabaseクライアント、データアクセス、日付ユーティリティ
├── App.jsx
├── App.css
└── main.jsx
supabase/
├── schema.sql       # 現在のDB全体の完成形（テーブル定義 + RLSポリシー）
└── migrations/      # バージョンごとの変更履歴（手動でSupabase SQL Editorに適用）
```
