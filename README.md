# Decaf Log

日々のカフェイン摂取量を記録し、1日のカフェイン目標に対する進捗・連続達成日数・日別の推移を確認できるWebアプリ（Version 1.4）。

飲み物・カフェイン量・摂取日時を記録し、今日の合計摂取量と履歴を確認できます。また、1日のカフェイン目標値を設定し、ダッシュボードで目標に対する進捗と連続達成日数を、履歴画面で直近7日間の日別摂取量グラフを確認できます。

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

### Version 1.2

- ダッシュボードへの目標進捗表示（今日の摂取量・目標値・進捗率・残り摂取可能量）
- 目標未設定時：「1日の目標が設定されていません。」＋`/settings`への導線
- 目標到達時（「目標上限に達しました」）・超過時（実際の進捗率＋超過mg、警告表示）の表示
- 目標0mg時の特別扱い（0除算をせず、`NaN`/`Infinity`を表示しない）
- 目標値の取得中・失敗時も、今日の合計・最近の記録の表示をブロックしない独立設計
- 進捗バーへのアクセシビリティ属性（`role="progressbar"`等）の付与

### Version 1.3

- `/history` への日別カフェイン摂取量グラフ（Rechartsの棒グラフ）の追加
- 今日を含む直近7日間を固定表示。記録がない日は0mgとして表示
- ローカルタイムゾーン基準の暦日で集計、同日の複数記録は合算
- Tooltipで各日の実際のmg値を確認可能
- ダッシュボードへのグラフ追加は行わない（`/history`のみ）

### Version 1.4

- ダッシュボードへの連続達成日数カード（`StreakCard`）の追加
- 達成の定義：その日の合計摂取量が目標値以下（`dailyTotalMg <= goalMg`、目標値ちょうど一致も達成）
- 今日は判定対象外。昨日から過去へ遡って計算し、`caffeine_records`の最初の記録日より前には遡らない
- 記録がない日は0mgとして扱う（正の目標値でも達成扱い）
- 目標未設定時：案内文＋`/settings`への導線（`GoalProgress`と表現・UIを統一）
- 連続達成日数が0日の場合も、特別な文言なしに通常の数値表示
- `StreakCard`専用のSupabase通信・独立したLoading/Error状態は追加せず、目標進捗表示と同じ取得結果を共有

## 未実装機能（Version 1.5以降で検討）

以下は現時点では未実装です。`docs/requirements.md` §7・§28 を参照してください。

- 飲み物プリセット
- 記録編集
- ユーザー認証
- 通知、SNS連携、ダークモードなど

## 技術スタック

- React / Vite / JavaScript
- React Router
- Supabase（PostgreSQL）
- Recharts（日別カフェイン摂取量グラフ）
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

**Version 1.4の連続達成日数に関する既知の制約：** `app_settings.daily_caffeine_goal_mg` は過去の目標値の履歴を保持していません。
連続達成日数の計算では、現在設定されている目標値を過去の日付にも適用します。そのため、目標値を変更すると過去の日付の達成判定が変わり、
連続達成日数の表示が変化する場合があります。

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
