# Decaf Log Version 1.0 MVP 実装計画

## 0. この文書の位置づけ

本書は `docs/requirements.md` および `docs/screen-design.md` に基づき、Version 1.0 MVPを完成させるための実装計画をまとめたものである。

仕様が曖昧な場合の判断は `docs/requirements.md` を優先する。本書はあくまで実装の進め方を整理したものであり、仕様そのものを変更するものではない。

---

## 0.1 現状確認まとめ

- 現在の `src/` は Vite のデフォルトテンプレートのまま（`App.jsx` はカウンターのサンプル）。React Router・Supabaseクライアント・テスト環境は未導入。
- `package.json` に `react-router-dom`、`@supabase/supabase-js`、テスト系パッケージが存在しない。
- `docs/requirements.md` と `docs/screen-design.md` は整備済み。
- `.gitignore` は `*.local` を除外済みのため、`.env.local` は自動的にコミット対象外になる。

---

## 0.2 事前確認済みの重要判断（セキュリティ）

MVPには認証機能がない（`docs/requirements.md` §21）。この状態でのSupabase RLSポリシーについてユーザーへ確認し、以下の方針で合意済み。

**方針：`caffeine_records` テーブルに限り、anonロールへ `SELECT` / `INSERT` / `DELETE` を許可する公開ポリシーを作成する。** 他のテーブルには影響させない。UPDATEポリシーは作成しない（MVPに記録編集機能はないため）。

**この構成はMVP・デモ用途に限定した暫定的な制約であることを明記する。** 認証なしでanonロールに書き込み・削除まで許可しているため、公開URLを知る誰でもデータを追加・削除できる状態になる。個人利用・デモの範囲では許容するが、将来的に一般ユーザー向けに公開する場合は、Supabase Authを導入し、`caffeine_records` に `user_id` カラムを追加した上で「本人の行のみ操作可能」なRLSポリシーへ変更する方針とする。この制約と将来方針はREADMEにも明記する（§2, §4参照）。

---

## 1. 実装する機能（MVPのみ）

`docs/requirements.md` §6, §9〜17 に基づく。

- FR-001 カフェイン摂取記録登録（飲み物名・カフェイン量・摂取日時）
- FR-002 Supabaseへの保存（成功時: ダッシュボードへ遷移＋反映／失敗時: 入力保持＋エラー表示）
- FR-003 履歴表示（`consumed_at` 降順）
- FR-004 記録削除（`window.confirm()` による削除確認）
- FR-005 今日のカフェイン合計（**ブラウザのローカルタイムゾーンにおける「今日」を基準に判定する**。`consumed_at` はtimestamptzで保存されるが、UTCの日付文字列を切り出して比較する実装は行わない。ローカルタイムゾーンでの日付境界を用いることで、UTCとの時差により日付がずれる問題を防ぐ）
- 入力バリデーション（飲み物名必須／カフェイン量必須・0以上／日時必須）
- Loading / Error / Empty の3状態（ダッシュボード・履歴）
- フォームの Idle / Submitting / Error / Validation Error 状態、二重送信防止
- レスポンシブ（モバイル1カラム、PC最大幅700px程度）、Bottom Navigation

**実装しないもの**（`docs/requirements.md` §7・`docs/screen-design.md` §36 に明記）：目標設定、進捗バー、グラフ、連続達成日数、飲み物プリセット、記録編集、通知、SNS、AIアドバイス、認証、ダークモード、`/settings` 画面など。

---

## 2. 作成・変更予定ファイル

`docs/screen-design.md` §37 の推奨構成に準拠する。

### 新規作成

```
src/lib/supabaseClient.js
src/components/Header.jsx
src/components/BottomNavigation.jsx
src/components/CaffeineSummary.jsx
src/components/RecentRecords.jsx
src/components/RecordForm.jsx
src/components/RecordList.jsx
src/components/RecordItem.jsx
src/pages/DashboardPage.jsx
src/pages/RecordPage.jsx
src/pages/HistoryPage.jsx
src/lib/caffeineRecords.js      # Supabase CRUD + camelCase⇔snake_case変換をまとめる薄い層
src/lib/dateUtils.js            # 日付表記、および「今日」の判定（ブラウザのローカルタイムゾーン基準。UTC日付文字列の切り出しでは判定しない）
supabase/schema.sql             # テーブル定義 + RLSポリシー
.env.example
vercel.json                     # SPA rewrite設定（/record, /historyの直接アクセス・リロード対応）
src/test/setup.js               # Vitest + jest-dom セットアップ
src/**/*.test.jsx               # 各コンポーネント・pageのテスト（TEST-001〜009に対応。各機能の実装直後に作成する。§5参照）
.github/workflows/ci.yml
```

### 変更

```
src/App.jsx        # 既存のVite雛形を削除し、Router + レイアウトに置き換え
src/App.css         # レイアウト・共通スタイルに置き換え
src/index.css       # 必要なグローバルスタイルのみ残す
main.jsx            # 変更なし想定（Appを読み込むだけなので現状維持）
package.json        # 依存追加、test/lintスクリプト調整
vite.config.js       # Vitest設定を追加（test環境: jsdom）
README.md            # 実装済み/未実装機能、セットアップ手順、およびSupabase RLSがMVP・デモ用途の暫定構成である旨と将来のAuth移行方針を明記
```

### 削除

```
src/assets/hero.png, react.svg, vite.svg（雛形用、未使用になるため）
public/icons.svg（雛形用アイコン、使わなければ削除）
```

---

## 3. 必要なnpmパッケージ

### dependencies

- `react-router-dom` — ルーティング（`/`, `/record`, `/history`）
- `@supabase/supabase-js` — Supabase接続

### devDependencies

- `vitest` — テストランナー
- `@testing-library/react` — コンポーネントテスト
- `@testing-library/jest-dom` — DOMマッチャー
- `@testing-library/user-event` — ユーザー操作シミュレーション
- `jsdom` — Vitestのブラウザ環境エミュレーション

追加はこれのみとする。TypeScript・Tailwind・状態管理ライブラリ等は導入しない（`CLAUDE.md` §4）。

---

## 4. Supabase側で必要な設定

1. Supabaseプロジェクトを作成（既にあれば流用）。
2. `supabase/schema.sql` として以下を管理する。
   - `caffeine_records` テーブル作成
     - `id uuid primary key default gen_random_uuid()`
     - `drink_name text not null`
     - `caffeine_mg numeric not null check (caffeine_mg >= 0)`
     - `consumed_at timestamptz not null`
     - `created_at timestamptz not null default now()`
   - RLSを有効化（`ENABLE ROW LEVEL SECURITY`）
   - `caffeine_records` テーブルに限り、anonロールへ `SELECT` / `INSERT` / `DELETE` を許可する公開ポリシーを作成（§0.2の合意事項）
3. `.env.example` に `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` のキー名のみ記載する（値は空）。
4. 実際の値は開発者が `.env.local` に設定する（Git管理対象外）。
5. GitHub Actionsのビルド確認では、ダミー値の環境変数でbuildが通ることを確認する（Supabase実接続はしない）。
6. **上記の公開ポリシー（anonへのSELECT/INSERT/DELETE許可）はMVP・デモ用途に限定した暫定構成であることを明記する。** 将来的に一般ユーザー向けに公開する場合は、Supabase Authを導入し、`caffeine_records` に `user_id` を追加した上で本人の行のみ操作可能なRLSへ移行する方針とする（詳細は§0.2）。この制約はREADMEにも記載する。

---

## 5. 実装する順番

テストは最後にまとめて作成せず、**各主要機能の実装直後に関連テストを作成・実行する**方式で進める。基本サイクルは以下の通り。

```text
実装 → 関連テスト作成・実行 → lint/test確認 → 次の機能
```

1. 依存パッケージ導入・Vitest設定（土台。この時点ではテスト対象コードがないため後続ステップから適用）
2. `supabase/schema.sql` 作成 → Supabaseプロジェクトへ適用、`.env.example` 作成
3. データ層実装：`src/lib/supabaseClient.js`, `src/lib/caffeineRecords.js`, `src/lib/dateUtils.js`
   → 関連テスト：`dateUtils`のローカルタイムゾーン基準「今日」判定ロジック
   → `lint`/`test`確認
4. ルーティング＋共通レイアウト（`App.jsx`, `Header`, `BottomNavigation`, 3画面の空実装）
   → 関連テスト：TEST-001（アプリタイトル表示）、各ルートの表示確認
   → `lint`/`test`確認
5. カフェイン記録画面（`RecordForm` + `RecordPage`）とバリデーション → FR-001/FR-002
   → 関連テスト：TEST-002〜006（入力・登録・各バリデーションエラー）
   → `lint`/`test`確認
6. 履歴画面（`RecordList`, `RecordItem`, `HistoryPage`）→ FR-003、削除 → FR-004
   → 関連テスト：TEST-008（履歴表示）、TEST-009（削除処理）
   → `lint`/`test`確認
7. ダッシュボード（`CaffeineSummary`, `RecentRecords`, `DashboardPage`）→ FR-005、Empty/Loading/Error
   → 関連テスト：TEST-007（合計カフェイン量計算）、Empty/Loading/Error表示の確認
   → `lint`/`test`確認
8. 各種状態（Loading/Error/Empty）の最終確認・レスポンシブ調整 → 既存テストを再実行し回帰がないことを確認
9. production build確認（`npm run build`）
10. GitHub Actions workflow作成（`npm ci` → lint → test → build）
11. README更新（実装済み/未実装機能、およびSupabase RLSがMVP・デモ用途の暫定構成である旨と将来のAuth移行方針を明記）
12. Vercelデプロイ工程（詳細は§7）
    - GitHubリポジトリとVercelプロジェクトの連携
    - VercelにProduction環境変数（`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`）を設定
    - `vercel.json` によるSPA rewrite設定を追加し、`/record`・`/history`の直接アクセス／リロードに対応
    - デプロイ実行
    - 公開URLでのスモークテスト
13. 最終確認（§8のMVP完成条件をすべて満たすか確認）

---

## 6. テスト方針

- テストはまとめて最後に作成するのではなく、**§5の各ステップで対応する機能を実装した直後に作成・実行する**（実装 → 関連テスト → lint/test確認 → 次の機能）。
- Vitest + React Testing Libraryを使用し、Supabaseへの実通信はモック化する（例: `vi.mock('../lib/supabaseClient')`）。
- `docs/requirements.md` §24 のTEST-001〜009を、対応する実装ステップのタイミングでテストケースとして実装する。
  - TEST-001: アプリタイトル表示（§5-4）
  - TEST-002: フォーム入力（飲み物名・カフェイン量）（§5-5）
  - TEST-003: 正常入力での登録実行（§5-5）
  - TEST-004: 飲み物未入力エラー（§5-5）
  - TEST-005: カフェイン量未入力エラー（§5-5）
  - TEST-006: 負のカフェイン量エラー（§5-5）
  - TEST-007: 合計カフェイン量計算（100+30=130）。ローカルタイムゾーンでの「今日」判定が正しく機能することも合わせて確認する（§5-7）
  - TEST-008: 履歴表示（§5-6）
  - TEST-009: 削除処理（§5-6）
- 各ステップの直後に `npm run lint` と `npm run test` を実行し、失敗があればその場で修正してから次の機能へ進む。
- 過剰なテスト（スナップショット全体、E2E等）はMVPでは追加しない。

---

## 7. Vercelデプロイ工程

MVP完成条件にVercelへのデプロイを含める。§5-12に対応する詳細手順。

1. **GitHubとVercelの連携**：GitHubリポジトリをVercelプロジェクトへ接続する（Vite Reactプロジェクトとして自動検出される想定）。
2. **Production環境変数設定**：Vercelプロジェクトの環境変数（Production）に `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` を設定する。値はソースコードにハードコードしない。
3. **SPA rewrite設定**：React Router使用時、`/record` や `/history` を直接開いた場合やブラウザ更新した場合に404にならないよう、`vercel.json` にSPA向けのrewrite設定（すべてのパスを `index.html` へフォールバックさせる設定）を追加する。
4. **デプロイ**：Vercel経由でビルド・デプロイを実行する。
5. **公開URLでのスモークテスト**：デプロイ後、公開URL上で以下を確認する。
   - `/`, `/record`, `/history` がそれぞれ正常に表示される
   - `/record` と `/history` を**直接URLで開いても**正常に表示される
   - `/record` と `/history` で**ブラウザ更新（リロード）しても**正常に表示される（404にならない）
   - 記録の登録・履歴表示・削除が本番のSupabase接続で正しく動作する
   - 今日の合計値が実行環境（ブラウザ）のローカルタイムゾーンで正しく計算される

このスモークテストで問題が見つかった場合は、MVP完成条件を満たしていないものとして修正する。

---

## 8. MVP完成条件

`docs/requirements.md` §27・`docs/screen-design.md` §45 のチェックリストをそのまま採用し、すべて満たすことを完成条件とする。加えて以下を満たす。

- `npm run test` / `npm run lint` / `npm run build` がすべて成功する
- ブラウザ更新後もSupabase上のデータが保持されている
- README に実装済み/未実装機能が明記されている
- README にSupabase RLS（anonへのSELECT/INSERT/DELETE許可）がMVP・デモ用途の暫定構成であることと、将来的なSupabase Auth + user_id単位のRLSへの移行方針が明記されている
- 既知の重大な console error が残っていない
- Vercelへのデプロイが完了し、公開URLが存在する
- Vercelに Production環境変数（`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`）が設定されている
- 公開URLで `/`, `/record`, `/history` が正常に表示される
- 公開URLで `/record`・`/history` を直接開いた場合、およびブラウザ更新した場合にも正常に表示される（`vercel.json` のSPA rewriteにより404を防ぐ）
- 公開URLでのスモークテスト（記録登録・履歴表示・削除）が成功する
- 「今日のカフェイン合計」がブラウザのローカルタイムゾーンを基準に正しく計算され、UTCとの時差による日付ずれが発生しない
