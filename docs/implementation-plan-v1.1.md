# Decaf Log Version 1.1 実装計画

「1日のカフェイン目標設定」の実装計画。`docs/requirements.md`（Version 1.1詳細仕様・受け入れ条件）と `docs/screen-design.md`（SCR-004ほか）で確定した仕様に基づく。

**この時点ではまだソースコード・Supabase本番DBへの変更は行っていない。** 本書は実装前の計画のみを示す。

- 作成日: 2026-09-12
- 対象: Version 1.1「1日のカフェイン目標設定」のみ（Version 1.2「目標進捗プログレスバー」は対象外）

---

## 1. Version 1.1で実装する機能

- `/settings` 画面の追加
- FR-006：1日のカフェイン目標値（mg）の設定
  - 0以上の数値、または「未設定」を許可
  - 負数・数値として扱えない値は保存不可（バリデーションエラー）
  - 入力欄を空にして保存すると `NULL`（未設定）に戻せる
- FR-007：目標値の保存・表示
  - `/settings` を開いたとき、保存済みの目標値（未設定の場合はその旨）を表示
  - 保存成功時は `/settings` に留まり、「保存しました。」等の成功メッセージを表示
  - 保存失敗時は入力内容を保持しエラーメッセージを表示
- Loading状態（設定値取得中）／Error状態（取得失敗・保存失敗）
- Bottom Navigationへ「設定」を追加（4項目：ホーム／記録／履歴／設定）
- モバイルファーストの維持（既存レイアウト方針を踏襲）

### 確定した挙動の詳細

- **保存成功メッセージ**：「保存しました。」はタイマーによる自動消去を行わない。ユーザーが入力内容を変更したとき、または次回の保存処理を開始したときにクリアするシンプルな方式とする。
- **同時保存**：楽観ロック等の競合制御は実装しない。Last write winsとし、`updated_at` は保存のたびにアプリ側で現在時刻に更新する。単一ユーザー・個人利用・デモ用途を前提とする。

---

## 2. Version 1.1で実装しない機能

- **Version 1.2「目標進捗プログレスバー」は実装しない**
- **DashboardPageへの目標値表示は行わない**（目標値は `/settings` でのみ表示・変更する）
- グラフ、連続達成日数、飲み物プリセット、記録編集、認証、通知、ダークモードなど、`docs/requirements.md` §7に記載のMVP対象外機能
- `caffeine_records` テーブル・関連コード（`RecordForm`, `RecordList`, `RecordItem`, `DashboardPage`のカフェイン記録ロジック等）への変更
- キャンセルボタン（設定画面には設けない。Bottom Navigationで画面移動する）
- React Query等の新しいデータ取得ライブラリ、状態管理ライブラリの追加
- 同時保存に対する楽観ロック等の競合制御（Last write winsとする）
- 成功メッセージのタイマーによる自動消去
- Staging用の別Supabaseプロジェクトの追加（Vercel PreviewもProductionと同じSupabaseプロジェクトを参照する）
- Supabase CLIの導入（migrationは手動SQL Editor実行で運用する）

---

## 3. `app_settings` のDB設計

```text
テーブル名: app_settings
```

| カラム | 型 | 必須 | 内容 |
| --- | --- | ---: | --- |
| `id` | smallint | Yes | 固定値 `1`（Primary Key） |
| `daily_caffeine_goal_mg` | numeric | No（NULL許可） | 1日のカフェイン目標値。未設定は`NULL` |
| `updated_at` | timestamptz | Yes | 更新日時（アプリ側が保存時に設定） |

- `id` はuuidではなく固定値（`smallint`、`default 1`、`check (id = 1)`）とし、テーブルが常に1行のみになるようにする
- `daily_caffeine_goal_mg` は `NULL` または `0以上の数値` のみを許可する `CHECK` 制約を設ける
- 初期行（`id = 1`, `daily_caffeine_goal_mg = NULL`）はmigration実行時に1件だけ作成する
- アプリケーションコードから `app_settings` へのINSERTは行わない（SELECT / UPDATEのみ）
- 既存の `caffeine_records` には一切変更を加えない

---

## 4. migration SQLの内容

`supabase/migrations/` 配下に新規ファイルを追加する（例：`supabase/migrations/20260912120000_add_app_settings.sql`。実際のファイル名は実装時のタイムスタンプに合わせる）。

```sql
-- Decaf Log - Version 1.1
-- app_settings テーブル定義とRLSポリシー
--
-- 前提:
-- MVP同様、認証機能を前提としない。
-- app_settingsは常に1行のみ（id = 1固定）で運用する単一設定テーブル。
-- daily_caffeine_goal_mgはNULL（未設定）を許可する。

create table if not exists public.app_settings (
  id smallint primary key default 1 check (id = 1),
  daily_caffeine_goal_mg numeric check (daily_caffeine_goal_mg is null or daily_caffeine_goal_mg >= 0),
  updated_at timestamptz not null default now()
);

-- RLSを有効化
alter table public.app_settings
enable row level security;

-- anonに必要な権限だけを明示的に付与する（INSERT・DELETEは不許可）
grant select, update
on table public.app_settings
to anon;

revoke insert, delete
on table public.app_settings
from anon;

-- 既存ポリシーがある場合に備えて削除
drop policy if exists "Allow public read access to app_settings"
on public.app_settings;

drop policy if exists "Allow public update access to app_settings"
on public.app_settings;

-- 公開読み取り
create policy "Allow public read access to app_settings"
on public.app_settings
for select
to anon
using (true);

-- 公開更新（値の妥当性はテーブルのCHECK制約で担保する）
create policy "Allow public update access to app_settings"
on public.app_settings
for update
to anon
using (true)
with check (true);

-- INSERT/DELETEポリシーは作成しない

-- 初期行（id = 1, 未設定）を1件だけ作成する
insert into public.app_settings (id, daily_caffeine_goal_mg)
values (1, null)
on conflict (id) do nothing;
```

- `on conflict (id) do nothing` により、誤って複数回実行しても2行目が増えたりエラーになったりしない（冪等性の担保）
- `drop policy if exists` は既存の `schema.sql` の書き方（`caffeine_records`）にならい、再実行時の安全性を確保する

---

## 5. `schema.sql` への反映内容

`supabase/schema.sql` は「現在のDB全体の完成形」を表すドキュメントとして扱う方針のため、既存の `caffeine_records` の定義はそのまま残し、末尾に `app_settings` の定義（§4のSQLと同内容）を追記する。

- 既存の `caffeine_records` に関する記述（コメント含む）は一切変更しない
- `app_settings` のブロックも同様に「MVP・デモ用途では認証を前提としない」旨のコメントを付記する
- ファイル全体としては、新規プロジェクトを一から構築する際に上から順に実行すれば、Version 1.0 + Version 1.1相当のDBが再現できる状態を維持する

---

## 6. RLS / GRANT方針

| テーブル | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `caffeine_records`（変更なし） | 許可 | 許可 | 不許可 | 許可 |
| `app_settings`（新規） | 許可 | **不許可** | 許可 | **不許可** |

- `app_settings` はRLSを無効化しない
- anonへのGRANTは `SELECT` と `UPDATE` のみ（初期行はmigration側で作成済みのため、アプリからの `INSERT` は不要）
- `caffeine_records` のRLS・GRANT・ポリシーには一切変更を加えない

---

## 7. 作成するファイル

```
src/pages/SettingsPage.jsx
src/components/SettingsForm.jsx
src/lib/appSettings.js                 # fetchGoal / saveGoal
src/pages/SettingsPage.test.jsx
src/components/SettingsForm.test.jsx
supabase/migrations/20260912120000_add_app_settings.sql
```

---

## 8. 変更するファイル

```
src/App.jsx                    # /settings ルートを追加（既存3ルートは変更しない）
src/components/BottomNavigation.jsx  # 「設定」項目を追加（既存3項目は変更しない）
src/App.css                     # 設定画面・成功メッセージ用のスタイル、Bottom Navigation 4項目化に伴う軽微な調整を追加
                                 # （大きなデザイン変更はしない。狭いスマートフォン幅でも横スクロール・
                                 #  文字切れ・操作不能が発生しないことを確認する）
src/App.test.jsx                # ボトムナビゲーションのテストに「設定」リンクの確認を追加、/settingsルートの表示確認を追加
supabase/schema.sql              # app_settingsの定義を追記（既存のcaffeine_records部分は変更しない）
README.md                        # 実装済み機能欄にVersion 1.1の内容を追記（実装・確認完了後に更新）
```

`RecordForm.jsx`, `RecordList.jsx`, `RecordItem.jsx`, `DashboardPage.jsx`, `HistoryPage.jsx`, `caffeineRecords.js`, `dateUtils.js`, `supabaseClient.js` はいずれも変更しない。

---

## 9. 実装順序

Version 1.1全体のワークフローは以下の順序で進める（ユーザー確定・最終版）。

```text
1.  Version 1.1をfeature branch上で実装
2.  関連テスト
3.  Version 1.0回帰テスト
4.  npm run lint
5.  npm run build
6.  migration SQLの最終確認
7.  Version 1.1の変更をcommit
8.  feature/v1.1-daily-goal をGitHubへpush
9.  Vercel Preview Deploymentの生成を確認
10. Supabase本番DBへmigrationを手動適用
11. Vercel PreviewでVersion 1.1を確認
12. Version 1.1受け入れ条件を確認
13. Version 1.0の既存機能を再確認
14. 問題がなければmainへmerge
15. Production Deployment
16. Productionで最終スモークテスト
```

**重要：** Vercel Preview Deployment自体はfeature branchのpush直後（ステップ9）に生成されるが、その時点ではSupabase本番DBに `app_settings` がまだ存在しないため、`/settings`機能の動作確認は行っても「完了」扱いにしない。migration適用（ステップ10）後に、あらためてPreview上で正式に確認する（ステップ11）。

今回はPull Requestを先に作成する必要はない。featureブランチへpushし、Preview確認とmigration確認が完了したのち、必要に応じてPRを作成して`main`へマージする（ステップ14）。

各実装ステップ（ステップ1・2）自体は、従来通り「実装 → 関連テスト作成・実行 → lint/test確認 → 次の機能」の順で機能単位に進める。

1. Version 1.1をfeature branch上で実装する
   1. `supabase/migrations/` にVersion 1.1用migration SQLを作成し、`supabase/schema.sql` にも反映する（**この時点ではまだ本番DBへは適用しない**）
   2. データ層：`src/lib/appSettings.js`（`fetchGoal`, `saveGoal`）を実装
   3. `SettingsForm.jsx` を実装（入力・バリデーション・保存・成功/失敗メッセージ・二重送信防止）
   4. `SettingsPage.jsx` を実装（Loading/Error状態、`SettingsForm`の呼び出し）
   5. `App.jsx` に `/settings` ルートを追加、`BottomNavigation.jsx` に「設定」を追加（4項目化に伴うCSS調整含む）
2. 関連テストを作成・実行する（各実装直後に§10のTEST-101〜112相当を作成。`App.test.jsx`は設定リンク・`/settings`ルートの表示確認を追加）
3. Version 1.0の既存テスト（27件）を含めて回帰テストを実行する（§11）
4. `npm run lint` を実行し、成功を確認する
5. `npm run build` を実行し、成功を確認する
6. `supabase/migrations/` のmigration SQLの内容を最終レビューする（構文・冪等性・RLS/GRANTの範囲。まだ適用しない）
7. Version 1.1の変更をcommitする
8. `feature/v1.1-daily-goal` をGitHubへpushする
9. Vercel Preview Deploymentが生成されたことを確認する（この時点では `/settings` の動作確認は「未完了」扱い）
10. Supabase本番DBへmigrationを手動適用する（ユーザーの確認・実行を経て実施。§12）
11. Vercel PreviewでVersion 1.1（`/settings`）をあらためて確認する。ここで初めて正式な動作確認として扱う（§15）
12. Version 1.1受け入れ条件（§16）を確認する
13. Version 1.0の既存機能を再確認する（§11の回帰テストに加え、Preview上での目視確認）
14. 問題がなければ、必要に応じてPRを作成した上で`main`へマージする（§17）
15. `main`へのマージにより、VercelがProduction Deploymentを自動実行する
16. Productionで最終スモークテストを実施する

---

## 10. Version 1.1のテストケース

| テストID | 内容 |
| --- | --- |
| TEST-101 | 設定画面が表示される（見出し等） |
| TEST-102 | 保存済みの目標値が入力欄に表示される |
| TEST-103 | 未設定（`NULL`）の場合は入力欄が空欄で表示される |
| TEST-104 | 0以上の数値を入力して保存できる（`saveGoal`が正しい値で呼ばれる） |
| TEST-105 | 負数を入力するとバリデーションエラーになり保存されない |
| TEST-106 | 数値として扱えない値（例："abc"）を入力すると保存できずエラーになる |
| TEST-107 | 入力欄を空にして保存すると `daily_caffeine_goal_mg` が `NULL` として保存される（＝未設定に戻る） |
| TEST-108 | 保存成功時、`/settings` に留まり成功メッセージが表示される |
| TEST-109 | 保存失敗時、エラーメッセージが表示され入力内容が保持される |
| TEST-110 | 設定値の取得に失敗した場合、エラーメッセージが表示される |
| TEST-111 | 読み込み中はLoading状態（「読み込み中...」）が表示される |
| TEST-112 | Bottom Navigationに「設定」が表示され、`/settings` へ遷移できる |

「保存後にブラウザを更新しても値が維持される」（`docs/requirements.md` の受け入れ条件）は、ユニットテストでは `fetchGoal` が画面表示のたびに最新値を取得しにいくことを検証する形でカバーし、実際のブラウザ更新後の永続化確認はSupabase接続後のローカル動作確認・Vercel Preview／本番でのスモークテストで行う。

---

## 11. Version 1.0の回帰テスト

確定したワークフロー（§9）では、Version 1.0の回帰確認はVercel Preview確認・Version 1.1受け入れ条件確認のあと、`main`へのマージ直前の最終チェックポイントとして改めて実施する。加えて、実装中も各ステップの`npm run test`実行時に既存テストが常に一緒に実行されるため、回帰は継続的にも確認される。

- 既存の27件のテスト（`dateUtils.test.js`, `App.test.jsx`, `RecordForm.test.jsx`, `HistoryPage.test.jsx`, `DashboardPage.test.jsx`）をすべて再実行し、全件成功することを確認する
- `App.test.jsx` はBottom Navigationの項目数変更に伴い一部更新するが、「ホーム」「記録」「履歴」各リンクの存在確認と、`/`, `/record`, `/history` の表示確認という既存の検証内容自体は変更しない
- `caffeine_records` に関わるコード（`RecordForm`, `RecordList`, `RecordItem`, `DashboardPage`のカフェイン集計ロジック, `HistoryPage`, `caffeineRecords.js`, `dateUtils.js`）は無変更のため、対応するテストの内容も変更しない

---

## 12. Supabase本番DBへのmigration適用手順

1. `supabase/migrations/` のSQL内容をレビューする（構文・冪等性・RLS/GRANTの範囲を確認）
2. Supabaseダッシュボードの SQL Editor で、レビュー済みのSQLを実行する（Version 1.0の `schema.sql` を適用したときと同じ手順）
3. 実行後、以下を確認する
   - `app_settings` テーブルが作成されている
   - `select * from app_settings;` で `id = 1`, `daily_caffeine_goal_mg = null` の行が1件だけ存在する
   - `caffeine_records` テーブル・データに変更がないことを確認する
4. この作業はSupabase本番環境への手動操作にあたるため、**GitHub feature branchへのpush・Vercel Preview Deployment生成の確認後、ユーザーの確認・実行を経て行う**（Claude Codeが無断で本番DBへ適用することはない）
5. 確定したワークフロー（§9ステップ10）上、この適用は「Preview Deploymentの生成確認（ステップ9）」の後・「Preview上でのVersion 1.1の正式な動作確認（ステップ11）」の前に行う。Vercel PreviewもProductionと同じSupabaseプロジェクトを参照するため、migration適用前は `/settings` にアクセスするとエラーになるが、これは想定通りであり、Version 1.1の動作確認はこの適用が完了するまで「未完了」として扱う（§15参照）

---

## 13. test / lint / build確認

- 各実装ステップ後（§9参照）に `npm run test` と `npm run lint` を実行し、失敗があればその場で修正する
- 実装完了後、最終確認として以下をすべて実行し、成功を確認する

```bash
npm run test
npm run lint
npm run build
```

---

## 14. GitHub feature branchへのpush

- ブランチ名：`feature/v1.1-daily-goal`
- `main` を直接変更せず、feature branchで実装・コミットする
- test/lint/build成功、migration SQLの最終レビュー、commit後、featureブランチをGitHubへpushする（§9ステップ7〜8）
- **今回はPull Requestを先に作成する必要はない。** featureブランチへpushし、Vercel Preview確認・Supabase migration適用・Preview上での再確認が完了したのち、必要に応じてPRを作成して`main`へマージする（§9ステップ14）

---

## 15. Vercel Preview Deploymentでの確認

Preview確認は2段階に分かれる。**migration適用前の段階を「動作確認完了」とは扱わない。**

### 15.1 push直後（§9ステップ9・migration適用前）

- GitHubのfeatureブランチをpushすると、Vercelが自動的にPreview Deploymentを作成する（既にGitHub連携済みのため追加設定は不要な想定）
- この時点ではPreview Deploymentが生成され、ビルドが成功していることのみを確認する
- `app_settings` テーブルが本番Supabaseにまだ存在しないため、`/settings` にアクセスするとエラーになる想定であり、これは想定通りの状態である（異常ではない）
- 既存の `/`, `/record`, `/history` は `caffeine_records` のみを参照するため、この時点でも問題なく動作するはずである

### 15.2 migration適用後（§9ステップ11・正式な動作確認）

Supabase本番DBへのmigration適用（§12）が完了したのち、同じPreview URL上で以下をあらためて確認し、これをもって「Version 1.1のPreviewでの動作確認完了」とする。

- `/settings` が表示される
- 保存済みの目標値（未設定の場合はその旨）が表示される
- 目標値の設定・保存ができる
- 既存の `/`, `/record`, `/history` に影響がないこと

**Previewから設定した値も本番Supabaseへ保存される。** Preview DeploymentはProductionと同じSupabaseプロジェクトを参照し、Staging用の別Supabaseプロジェクトは今回追加しないため、個人利用・デモ用途であることを前提にこの点は許容する（ユーザー確定事項）。

---

## 16. Version 1.1受け入れ条件

`docs/requirements.md`・`docs/screen-design.md` に記載済みの内容を転記する。Supabase本番DBへのmigration適用後、Vercel Preview上での正式な動作確認（§15.2、§9ステップ11）をもって以下を確認する（§9ステップ12）。

- [ ] `/settings` が正常に表示される
- [ ] 保存済みの目標値が表示される（未設定の場合は未設定として表示される）
- [ ] 目標値を入力できる
- [ ] 0以上の数値を保存できる
- [ ] 負数を入力するとエラーになる
- [ ] 数値として扱えない値は保存できず、バリデーションエラーになる
- [ ] 一度設定した目標値を入力欄から削除して保存すると、`daily_caffeine_goal_mg` が `NULL` になり「未設定」状態へ戻せる
- [ ] 目標値を保存すると `/settings` 画面に留まり、保存成功が分かる
- [ ] 保存失敗時にエラーメッセージが表示される
- [ ] 保存後にブラウザを更新しても、保存した目標値または未設定状態が維持される
- [ ] Loading状態が存在する
- [ ] Error状態が存在する
- [ ] Bottom Navigationに「設定」が追加され、`/settings` へ遷移できる
- [ ] スマートフォン幅で問題なく操作できる
- [ ] 既存のVersion 1.0機能（記録・履歴・削除・今日の合計）に影響がない
- [ ] テストが成功する
- [ ] lintが成功する
- [ ] production buildが成功する

---

## 17. mainへmergeする前の最終確認項目

確定したワークフロー（§9）のステップ14「問題がなければmainへmerge」の直前に、以下をすべて確認する。

1. [ ] `npm run test` / `npm run lint` / `npm run build` がすべて成功している
2. [ ] `caffeine_records` 関連のコード・DB定義に差分がないことを確認済み
3. [ ] `DashboardPage.jsx` に目標値・進捗表示が追加されていないことを確認済み
4. [ ] Version 1.2相当（プログレスバー等）のコードが混入していないことを確認済み
5. [ ] `feature/v1.1-daily-goal` をGitHubへpush済みで、Vercel Preview Deploymentが生成されていることを確認済み（§9ステップ8〜9）
6. [ ] Supabase本番DBへ `app_settings` のmigrationが適用済みであることを確認済み（§12、§9ステップ10）
7. [ ] migration適用後、Vercel Preview上でVersion 1.1（`/settings`）の動作確認が正式に完了している（§15.2、§9ステップ11）
8. [ ] §16のVersion 1.1受け入れ条件をすべて満たしている（§9ステップ12）
9. [ ] Version 1.0の既存27件のテスト・既存機能（記録・履歴・削除・今日の合計）を再確認済みで、回帰がない（§11、§9ステップ13）
10. [ ] README等ドキュメントの更新要否を確認済み

上記すべてを満たしたら、必要に応じてPRを作成し、ユーザーの承認を得てから `main` へマージする（§9ステップ14）。本プロジェクトは既にGitHubとVercelが連携済みのため、マージにより自動的にProduction Deploymentが実行される（§9ステップ15）。マージ・Production Deployment後は、`docs/mvp-implementation-report.md`と同様の形で、Production環境における最終スモークテスト（§9ステップ16）を実施する。
