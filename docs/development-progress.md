# Decaf Log 開発進捗メモ

Claude Codeで作業を再開する際に読む、現在の進捗状況の記録。仕様そのものはここには書かない（仕様は `docs/requirements.md` / `docs/screen-design.md` を参照）。

- 最終更新日: 2026-09-12
- 最新コミット: `8b24e9e` "Finalize Decaf Log v1.0 MVP"（`origin/main` と同期済み）

---

## 1. 現在の状況

**Version 1.0 MVPは完成し、Vercelへ本番デプロイ済み。** ローカル・本番環境ともに動作確認済みで、現時点で緊急の作業は残っていない。

- リポジトリ: `Lomdi2002/decaf-log`（`main`ブランチ）
- Supabaseプロジェクト: 作成済み・スキーマ適用済み（`supabase/schema.sql`）
- Vercel: GitHub連携済み、Production環境変数設定済み、デプロイ済み
- ローカル `.env.local`: 設定済み（Git管理対象外）

---

## 2. 本日（2026-09-12）完了した作業

1. `docs/requirements.md` / `docs/screen-design.md` の確認、`docs/implementation-plan.md` の作成（Vercelデプロイ工程・テスト方式・タイムゾーン方針・Supabase RLS方針を含めて数回修正）
2. Version 1.0 MVPの実装
   - データ層：`src/lib/supabaseClient.js`, `caffeineRecords.js`, `dateUtils.js`
   - ルーティング・共通レイアウト：`App.jsx`, `Header`, `BottomNavigation`
   - 記録画面：`RecordForm` / `RecordPage`（FR-001, FR-002）
   - 履歴画面：`RecordList`, `RecordItem`, `HistoryPage`（FR-003, FR-004）
   - ダッシュボード：`CaffeineSummary`, `RecentRecords`, `DashboardPage`（FR-005）
   - Loading / Error / Empty 状態、フォームバリデーション、二重送信防止
3. `supabase/schema.sql` 作成・Supabaseへ適用（`caffeine_records` テーブル + RLSポリシー）
4. Vitest + React Testing Library導入、TEST-001〜009を含む27件のテストを作成し全て成功
5. `npm run lint` / `npm run build` の成功を確認
6. GitHub Actions CI（`.github/workflows/ci.yml`）追加
7. `vercel.json`（SPA rewrite）追加
8. README更新（実装済み/未実装機能、セットアップ手順、Supabase RLSの制約と将来方針）
9. GitHubへコミット・push（`main`）
10. Vercelへの本番デプロイ実施、本番環境でのスモークテスト実施（登録・履歴・削除・データ永続化・直接URL/リロードでの`/record`・`/history`表示、いずれも成功）
11. `docs/mvp-implementation-report.md` を完了版として最終更新

---

## 3. 未完了の作業・既知の制約

MVPの受け入れ条件（`docs/requirements.md` §27）はすべて満たしているため、「未完了」はVersion 1.0のスコープ外の項目のみ。

- Version 1.1以降の機能は未着手（目標設定、進捗バー、グラフ、連続達成日数、飲み物プリセットなど。詳細は `docs/requirements.md` §28、`docs/mvp-implementation-report.md` §10）
- Supabase RLSはMVP・デモ用途の暫定構成（anonにSELECT/INSERT/DELETEを許可）。将来の一般公開時はSupabase Auth + `user_id`単位のRLSへの移行が必要（`docs/mvp-implementation-report.md` §9、`README.md`参照）
- 記録の編集機能はない（削除して登録し直す運用）
- 履歴は日付グループ化せずフラット表示（MVPでは許容される簡易実装）
- ESLintルール `react-hooks/set-state-in-effect` を無効化したまま（`eslint.config.js`。fetch-on-mountパターンの誤検知対策）

---

## 4. 次に行う作業（候補）

ユーザーからの指示がない限り、Claude CodeはMVP外の機能を勝手に追加しないこと（CLAUDE.md §3）。次回作業を始める場合は、以下のいずれかを確認してから着手する。

- Version 1.1（1日のカフェイン目標設定）に着手するか
- MVPの運用上の改善（バグ報告、UI微調整など）を先に行うか
- Supabase Authへの移行など、セキュリティ方針の見直しを行うか

上記いずれも、着手前にユーザーへ確認すること（仕様変更・DB変更・RLS方針変更に該当するため）。

---

## 5. 参照ドキュメント

- `docs/requirements.md` — 機能要件（Source of Truth）
- `docs/screen-design.md` — 画面設計
- `docs/implementation-plan.md` — Version 1.0 MVPの実装計画
- `docs/mvp-implementation-report.md` — Version 1.0 MVP完成レポート（完了版）
- `CLAUDE.md` — 開発ルール
