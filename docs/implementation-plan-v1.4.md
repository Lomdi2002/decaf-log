# Decaf Log Version 1.4 実装計画

「連続達成日数」の実装計画。`docs/requirements.md`（Version 1.4詳細仕様・受け入れ条件）と `docs/screen-design.md`（§73〜§78）で確定した仕様に基づく。

**この時点ではまだソースコードへの変更は行っていない。** 本書は実装前の計画のみを示す。

- 作成日: 2026-09-13
- 対象: Version 1.4「連続達成日数」のみ（Version 1.5「飲み物プリセット」は対象外）
- ブランチ：`feature/v1.4-streak`

---

## 0. 重要な制約（確認済み）

- 達成の定義：`dailyTotalMg <= goalMg`
- 今日は判定対象外。判定は昨日までを基準とする
- 記録がない日は0mgとして扱う
- 判定は`caffeine_records`に存在する最初の記録日より前には遡らない
- 一度も記録がなければ連続達成日数は0日
- 目標0mgでも通常の比較ルール（`<=`）をそのまま使用する（特別扱いしない）
- 現在の`daily_caffeine_goal_mg`を過去の日付にも適用する（目標変更で過去判定が変わることは既知の制約）
- ダッシュボード（`/`）に小さなカードとして表示する。既存機能を大きく変更しない
- Version 1.5は実装しない
- DB構造変更なし。migrationなし。RLS / GRANT変更なし
- 新しいライブラリの追加なし

---

## 1. Version 1.4で実装する機能

- ダッシュボード（`/`）に連続達成日数を表示するカード（`StreakCard`）を追加（FR-010）
- `caffeine_records`（既にDashboardPageが取得済み）と`app_settings.daily_caffeine_goal_mg`（既にDashboardPageが取得済み）を用いて、昨日までの連続達成日数を計算する
- 目標未設定（`NULL`）時：「目標を設定すると連続達成日数を確認できます。」＋`/settings`への導線を表示する
- 目標が設定されている場合：「連続達成 / ◯日」を表示する（0日の場合も同じ表示形式）
- 記録が一度もない場合：連続達成日数は0日
- 最初の記録日より前には遡らない

---

## 2. Version 1.4で実装しない機能

- Version 1.5「飲み物プリセット」
- 目標値の履歴管理（目標履歴テーブル、日別目標スナップショット等）
- 連続達成日数の表示に関する固定の遡り上限（30日・365日等）
- `DashboardPage`以外の画面への変更
- `caffeine_records` / `app_settings` のDB構造変更、Supabase migration、RLS / GRANTの変更
- 新しいライブラリの追加
- `RecordForm.jsx`, `RecordList.jsx`, `RecordItem.jsx`, `HistoryPage.jsx`, `SettingsForm.jsx`, `SettingsPage.jsx`, `BottomNavigation.jsx`, `App.jsx`, `GoalProgress.jsx`, `goalProgress.js`, `DailyChart.jsx`, `dailyTotals.js`, `caffeineRecords.js`, `appSettings.js`, `dateUtils.js`, `supabaseClient.js` への変更

---

## 3. `calculateStreak`の計算アルゴリズム

`src/lib/streak.js`に`calculateStreak(records, goalMg, referenceDate = new Date())`を実装する。

```js
import { getLocalDateKey } from './dateUtils'

function isAchieved(totalMg, goalMg) {
  return totalMg <= goalMg
}

export function calculateStreak(records, goalMg, referenceDate = new Date()) {
  if (goalMg === null || goalMg === undefined) {
    return { status: 'unset' }
  }

  if (records.length === 0) {
    return { status: 'counted', days: 0 }
  }

  const totalsByDateKey = new Map()
  let firstRecordDateKey = null

  records.forEach((record) => {
    const key = getLocalDateKey(record.consumedAt)
    totalsByDateKey.set(key, (totalsByDateKey.get(key) ?? 0) + record.caffeineMg)
    if (firstRecordDateKey === null || key < firstRecordDateKey) {
      firstRecordDateKey = key
    }
  })

  let days = 0
  const cursor = new Date(referenceDate)
  cursor.setDate(cursor.getDate() - 1) // 昨日から開始

  // 安全のための反復回数の上限（約270年分）。業務上の遡り上限ではなく、
  // 万一のロジック不具合による無限ループを防ぐための保険。
  const MAX_ITERATIONS = 100000

  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    const key = getLocalDateKey(cursor)
    if (key < firstRecordDateKey) {
      break
    }

    const totalMg = totalsByDateKey.get(key) ?? 0
    if (!isAchieved(totalMg, goalMg)) {
      break
    }

    days += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return { status: 'counted', days }
}
```

戻り値の`status`は`'unset'`（目標未設定）または`'counted'`（`days`に日数を持つ）のいずれか。`StreakCard`はこの`status`に応じて表示を出し分ける。

`YYYY-MM-DD`形式の`dateKey`同士は文字列比較で日付の前後関係が判定できるため（ゼロ埋めされているため辞書式順序と時系列順序が一致する）、`Date`オブジェクトへの変換なしに`firstRecordDateKey`との比較ができる。

---

## 4. 最初の記録日の求め方

`records`配列を1回走査し、各記録の`getLocalDateKey(record.consumedAt)`のうち最小の値（文字列比較で最も小さいもの＝最も古い日付）を`firstRecordDateKey`とする（§3のコード参照）。

`records`が空配列の場合は、この計算を行う前に`{ status: 'counted', days: 0 }`を返す（§3参照）。

---

## 5. 昨日から過去へ遡る処理

`referenceDate`（デフォルトは現在時刻）を基準に、`cursor.setDate(cursor.getDate() - 1)`で「昨日」を起点とする。

以降、`cursor`を1日ずつ過去へ進めながら（`cursor.setDate(cursor.getDate() - 1)`）、その日が達成かどうかを判定し、達成であれば`days`を1増やして次の日（さらに過去）へ進む。未達成の日、または`firstRecordDateKey`より前の日付に到達した時点でループを終了する。

`Date`の`setDate`/`getDate`はローカルタイムゾーンで動作するため、月またぎ・年またぎも正しく扱える（Version 1.3の`getLastNDates`と同じ考え方）。

---

## 6. 記録がない日の0mg処理

`totalsByDateKey`は記録が存在する日のみキーを持つ`Map`である。判定時に`totalsByDateKey.get(key) ?? 0`として参照することで、記録がない日は自動的に0mgとして扱われる（Version 1.3の`buildDailyTotals`と同じ考え方だが、`streak.js`独自に実装し、`dailyTotals.js`は変更しない。§13参照）。

---

## 7. 同日の複数記録の合算方法

`records.forEach`のループ内で、同じ`dateKey`を持つ記録の`caffeineMg`を`totalsByDateKey`へ加算していくことで合算する（§3のコード参照）。記録の並び順には依存しない。

---

## 8. ローカルタイムゾーンの扱い

`getLocalDateKey`（`dateUtils.js`、Version 1.3で追加済み）をそのまま再利用し、`consumed_at`・`referenceDate`（今日・昨日の計算）のいずれも、`getFullYear`/`getMonth`/`getDate`のみを使用したローカルタイムゾーン基準で判定する。UTC日付文字列の切り出しは行わない。

---

## 9. `goal=null` / `goal=0` の扱い

- `goal=null`（未設定）：`calculateStreak`は`{ status: 'unset' }`を返す。`StreakCard`は数値の代わりに案内文＋`/settings`導線を表示する（§11）
- `goal=0`：特別な分岐を設けない。`isAchieved(totalMg, 0)`は`totalMg <= 0`となり、`totalMg`は0以上の値しか取らない（負のカフェイン量は登録できない）ため、実質的に「その日の合計が0mgのときのみ達成」という、確定済み仕様（§0）と一致する結果になる

---

## 10. 今日を判定対象外にする処理

`calculateStreak`内で、判定の起点を`referenceDate`ではなく`referenceDate`の1日前（昨日）に設定することで、今日は最初から判定ループに含まれない（§5参照）。今日の合計値がどれだけ目標を超えていても、連続達成日数の計算には一切影響しない。

---

## 11. `StreakCard`の表示仕様

`src/components/StreakCard.jsx`を新規実装する。

```jsx
import { Link } from 'react-router-dom'

function StreakCard({ streak }) {
  if (streak.status === 'unset') {
    return (
      <section className="card streak-card">
        <p className="streak-label">連続達成</p>
        <p>目標を設定すると連続達成日数を確認できます。</p>
        <Link to="/settings" className="button button-secondary">
          目標を設定する
        </Link>
      </section>
    )
  }

  return (
    <section className="card streak-card">
      <p className="streak-label">連続達成</p>
      <p className="streak-value">{streak.days}日</p>
    </section>
  )
}

export default StreakCard
```

- 目標未設定時：「連続達成」の見出し＋案内文＋「目標を設定する」（`/settings`へのリンク）。Version 1.2の`GoalProgress`の「目標を設定する」導線とクラス名（`button button-secondary`）・文言を揃える
- 目標設定済み時：「連続達成」の見出し＋「◯日」（0日の場合も同じ形式で表示し、特別な文言は付けない）
- 大きすぎないシンプルなカードとし、既存の`.card`クラスをベースに最小限のスタイルを追加する（§14）

---

## 12. Loading / Error状態

`StreakCard`は`DashboardPage`が既に取得済みの`records`（`fetchRecords()`）と`goal`（`fetchGoal()`, Version 1.2で追加済み）から計算するため、**新しい独立したLoading/Error状態は追加しない**。

- `records`の取得中・失敗時：既存通りページ全体のLoading/Error表示のみとし、`StreakCard`は表示しない（**変更しない**）
- `goal`の取得中（`isGoalLoading`）：`GoalProgress`と同じタイミングで「読み込み中...」を表示し、`StreakCard`も表示しない
- `goal`の取得失敗（`goalError`）：`GoalProgress`と同じエラーメッセージ（「目標を取得できませんでした。」）の表示に含める形とし、`StreakCard`は表示しない
- 上記のいずれでもない場合：`GoalProgress`と同じ並びで`StreakCard`を表示する

`calculateStreak`は`records`・`goal`が揃った時点で呼び出す同期的な純粋関数であり、それ自体が非同期に失敗することはない。

---

## 13. 作成するファイル

```
src/lib/streak.js               # calculateStreak
src/lib/streak.test.js
src/components/StreakCard.jsx   # 連続達成カード
src/components/StreakCard.test.jsx
```

`streak.js`は`dailyTotals.js`と似た「暦日ごとに合算する」ロジックを内部に持つが、既存の`dailyTotals.js`（Version 1.3、直近7日固定・0mg補完済み配列を返す設計）とは用途が異なる（無制限に過去へ遡る）ため、共通化はせず`streak.js`内に独立して実装する。これにより`dailyTotals.js`・`DailyChart.jsx`など既存のVersion 1.3実装には一切手を加えない。

---

## 14. 変更するファイル

```
src/pages/DashboardPage.jsx      # StreakCardの表示を追加（GoalProgressの近く）
src/pages/DashboardPage.test.jsx  # 連続達成日数表示のテストを追加
src/App.css                       # .streak-card 等のスタイルを追加
```

`RecordForm.jsx`, `RecordList.jsx`, `RecordItem.jsx`, `HistoryPage.jsx`, `SettingsForm.jsx`, `SettingsPage.jsx`, `BottomNavigation.jsx`, `App.jsx`, `GoalProgress.jsx`, `goalProgress.js`, `DailyChart.jsx`, `dailyTotals.js`, `caffeineRecords.js`, `appSettings.js`, `dateUtils.js`, `supabaseClient.js`, `supabase/schema.sql`, `supabase/migrations/`, `package.json`はいずれも変更しない。

---

## 15. 実装順序

各ステップは「実装 → 関連テスト作成・実行 → lint/test確認 → 次の機能」の順で進める（Version 1.0〜1.3と同じ方針）。

1. `src/lib/streak.js`（`calculateStreak`）を実装
   → 関連テスト（§16のTEST-401〜411, 418〜419相当：未設定/0件/連続日数の基本パターン/境界日/0mg目標/複数記録合算/タイムゾーン/目標値ちょうど一致/記録なし日を挟む連続判定）
   → `lint`/`test`確認
2. `src/components/StreakCard.jsx`を実装
   → 関連テスト（§16のTEST-412〜414相当）
   → `lint`/`test`確認
3. `DashboardPage.jsx`に`StreakCard`を統合（既存の`isGoalLoading`/`goalError`/`goal`をそのまま再利用）
   → `DashboardPage.test.jsx`を更新（§16のTEST-415〜417相当）
   → `lint`/`test`確認
4. Version 1.0〜1.3の既存テスト（93件）をすべて再実行し、回帰がないことを確認（§17）
5. `npm run test` / `npm run lint` / `npm run build` を実行し、すべて成功することを確認する（§21）
6. Version 1.4の変更をcommitする
7. `feature/v1.4-streak` をGitHubへpushする（§22）
8. Vercel Preview Deploymentが生成されたことを確認する（§23）。Version 1.4もDB変更が不要なため、push直後のPreviewでそのまま動作確認を行える
9. Version 1.4受け入れ条件（§24）を確認する
10. Version 1.0〜1.3の既存機能を再確認する（§17、§25）
11. 問題がなければ、必要に応じてPRを作成した上で`main`へマージする（§25）
12. `main`へのマージにより、VercelがProduction Deploymentを自動実行する
13. Production環境で最終スモークテストを実施する（§26）

---

## 16. Version 1.4のテストケース

### `streak.js`（ロジック単体テスト）

| テストID | 内容 |
| --- | --- |
| TEST-401 | 目標が`null`のとき`status: 'unset'`を返す |
| TEST-402 | 記録が一度もない場合、`days: 0`を返す |
| TEST-403 | 昨日・一昨日が達成、3日前が未達成の場合、`days: 2`を返す |
| TEST-404 | 今日の合計が目標を超えていても、連続達成日数に影響しない（今日は判定対象外） |
| TEST-405 | 最初の記録日がちょうど昨日で、達成している場合、`days: 1`を返す |
| TEST-406 | 最初の記録日がちょうど昨日で、未達成の場合、`days: 0`を返す |
| TEST-407 | 最初の記録日が今日のみ（過去の記録がない）場合、`days: 0`を返す |
| TEST-408 | 目標0mg・ある日の記録が0件（0mg扱い）の場合、達成としてカウントされる |
| TEST-409 | 目標0mg・ある日の合計が1mg以上の場合、未達成としてカウントされる |
| TEST-410 | 同じ日の複数記録が合算された上で判定される |
| TEST-411 | ローカルタイムゾーン基準で日付が判定される（UTCと日付がずれるケースでも正しく判定する） |
| TEST-418 | 目標値とその日の合計値が完全に同じ場合（例：`goalMg: 200`, 昨日の合計: 200mg）も達成としてカウントされ、`days: 1`を返す |
| TEST-419 | 連続期間の途中に記録がない日があっても0mgとして達成扱いになる（例：`goalMg: 200`、昨日=記録なし(0mg)、一昨日=100mg、3日前=250mg → 昨日・一昨日は達成、3日前で連続終了、`days: 2`） |

### `StreakCard.jsx` / `DashboardPage.jsx`（表示テスト）

| テストID | 内容 |
| --- | --- |
| TEST-412 | 目標未設定時、「目標を設定すると連続達成日数を確認できます。」と「目標を設定する」（`/settings`リンク）が表示される |
| TEST-413 | 連続達成日数が0日の場合、特別な文言なしに「連続達成 / 0日」が表示される |
| TEST-414 | 連続達成日数が1日以上の場合、「連続達成 / ◯日」が正しく表示される |
| TEST-415 | 目標取得中は、`GoalProgress`と同様に`StreakCard`部分も表示されない（読み込み中表示） |
| TEST-416 | 目標取得に失敗した場合、`StreakCard`は表示されず、`GoalProgress`と共通のエラーメッセージが表示される |
| TEST-417 | 既存のダッシュボード表示（今日の合計・最近の記録・CTA）に影響がないことを確認する（回帰確認） |

---

## 17. Version 1.0〜1.3の回帰テスト

- 既存の93件のテスト（Version 1.0の27件 + Version 1.1の27件 + Version 1.2の23件 + Version 1.3の16件）をすべて再実行し、全件成功することを確認する
- `RecordForm.jsx`, `RecordList.jsx`, `RecordItem.jsx`, `caffeineRecords.js`（Version 1.0）、`SettingsForm.jsx`, `SettingsPage.jsx`, `appSettings.js`（Version 1.1）、`GoalProgress.jsx`, `goalProgress.js`（Version 1.2）、`HistoryPage.jsx`, `DailyChart.jsx`, `dailyTotals.js`, `dateUtils.js`（Version 1.3）はいずれも無変更のため、対応するテストの内容も変更しない
- `DashboardPage.test.jsx`は`StreakCard`追加に伴い更新するが、既存の「今日の合計計算」「Loading/Error/Empty状態」「最近の記録の表示」「目標進捗表示」のテスト内容自体は変更しない

---

## 18. DB変更が不要であることの確認

Version 1.4は表示の追加のみで完結し、DBスキーマの変更は不要である。

- 連続達成日数の計算に必要な値（`consumed_at`, `caffeine_mg`は`caffeine_records`、`daily_caffeine_goal_mg`は`app_settings`）はVersion 1.0〜1.2で既に揃っている
- 新しいテーブル・カラムの追加は行わない
- `supabase/schema.sql`・`supabase/migrations/`への追記は行わない
- Supabase本番DBへは一切アクセス・変更しない

---

## 19. RLS / GRANTが不要であることの確認

- `StreakCard`は`DashboardPage`が既に取得済みの`records`・`goal`（いずれも既存の`SELECT`権限で取得済み）を再利用するのみで、新しいSupabase操作は発生しない
- 既存のRLSポリシー・GRANT文（`supabase/schema.sql`）には一切変更を加えない

---

## 20. `package.json`変更が不要であることの確認

Version 1.4は既存の`react`・`react-router-dom`のみで実装が完結し、新しいライブラリの追加は不要である。`package.json` / `package-lock.json`に変更は加えない。

---

## 21. test / lint / build確認

- 各実装ステップ後（§15参照）に`npm run test`と`npm run lint`を実行し、失敗があればその場で修正する
- 実装完了後、最終確認として以下をすべて実行し、成功を確認する

```bash
npm run test
npm run lint
npm run build
```

---

## 22. GitHub feature branchへのpush

- ブランチ：`feature/v1.4-streak`
- `main`を直接変更せず、feature branch上で実装・コミットする
- test/lint/build成功後、featureブランチをGitHubへpushする
- Version 1.2・1.3のときと同様、PRを先に作成する必要はない。push後のPreview確認・受け入れ条件確認・回帰確認が完了したのち、必要に応じてPRを作成して`main`へマージする

---

## 23. Vercel Preview確認

- GitHubへpushすると、Vercelが自動的にPreview Deploymentを作成する
- Version 1.4はDBスキーマ変更が不要なため、push直後のPreviewでそのまま動作確認を行える
- Preview URL上で以下を確認する
  - ダッシュボードに連続達成カードが表示される
  - `/settings`で目標値を変更しながら、未設定時・設定時（0日／複数日）の表示を確認する
  - 記録の追加・削除後、連続達成日数が正しく再計算されること
  - 既存の`/record`, `/history`, `/settings`に影響がないこと
- Preview DeploymentはProductionと同じSupabaseプロジェクトを参照するため、Version 1.2・1.3のときと同様、目標値を一時的に変更する場合は確認前の値を記録し、確認後に元へ戻す

---

## 24. Version 1.4受け入れ条件

`docs/requirements.md`・`docs/screen-design.md`に記載済みの内容を転記する。

- [ ] ダッシュボードに連続達成日数が表示される
- [ ] 目標が未設定の場合、「0日」ではなく「目標を設定すると連続達成日数を確認できます。」と「目標を設定する」（`/settings`への導線）が表示される
- [ ] 目標が設定されている場合、昨日までの日々のうち、目標値以下だった日が連続して何日続いているかが正しく表示される
- [ ] 今日の摂取状況は連続達成日数の判定に含まれない
- [ ] 記録がない日は0mgとして扱われ、目標値以下であれば達成としてカウントされる
- [ ] 同じ日に複数記録がある場合は合算した上で判定される
- [ ] `caffeine_records`に一度も記録が存在しない場合、連続達成日数は「0日」と表示される
- [ ] 連続達成日数の判定は、最初の記録日より前の日付までは遡らない
- [ ] 目標0mgの場合、その日の合計が0mgなら達成、1mg以上なら未達成として扱われる
- [ ] 連続達成日数が0日の場合も、特別な文言なしに通常の数値表示になる
- [ ] 目標値を変更すると、過去の判定が変わり連続達成日数が変化しうる（既知の制約として許容する）
- [ ] 既存のダッシュボード表示（今日のカフェイン合計・目標進捗・最近の記録・CTA）に影響がない
- [ ] 既存のVersion 1.0〜1.3機能に影響がない
- [ ] `caffeine_records`・`app_settings`のDB構造・RLS・GRANTに変更がない
- [ ] テストが成功する
- [ ] lintが成功する
- [ ] production buildが成功する

---

## 25. mainへmergeする前の最終確認項目

1. [ ] `npm run test` / `npm run lint` / `npm run build` がすべて成功している
2. [ ] `caffeine_records` / `app_settings` のDB定義・RLS・GRANTに差分がないことを確認済み
3. [ ] `RecordForm.jsx`, `HistoryPage.jsx`, `SettingsForm.jsx`, `SettingsPage.jsx`, `BottomNavigation.jsx`, `GoalProgress.jsx`, `goalProgress.js`, `DailyChart.jsx`, `dailyTotals.js` に差分がないことを確認済み
4. [ ] Version 1.5相当（飲み物プリセット等）のコードが混入していないことを確認済み
5. [ ] `package.json` / `package-lock.json`に差分がないことを確認済み
6. [ ] `feature/v1.4-streak` をGitHubへpush済みで、Vercel Preview Deploymentが生成されていることを確認済み
7. [ ] Vercel Preview上でVersion 1.4の表示（未設定・0日・複数日、記録追加/削除後の再計算）を確認済み
8. [ ] §24のVersion 1.4受け入れ条件をすべて満たしている
9. [ ] Version 1.0〜1.3の既存93件のテストを含め、回帰確認が成功している
10. [ ] README等ドキュメントの更新要否を確認済み

上記すべてを満たしたら、必要に応じてPRを作成し、ユーザーの承認を得てから`main`へマージする。マージにより、Vercelが自動的にProduction Deploymentを実行する。

---

## 26. Production環境での最終スモークテスト

`main`マージ・Production Deployment完了後、本番URL上で以下を確認する。

- ダッシュボードに連続達成カードが表示される
- `/settings`で目標値を変更し、連続達成日数の表示が正しく変化することを確認する（未設定→設定、0日→複数日を含む。確認前に現在値を記録し、確認後に元へ戻す）
- 記録の追加・削除後、連続達成日数が正しく再計算されること
- 既存の`/`, `/record`, `/history`, `/settings`の動作に影響がないこと（記録・履歴・削除・今日の合計・目標進捗・目標設定・日別グラフ）
- 各ページの直接URLアクセス・ブラウザ更新が引き続き問題ないこと
- 重大なconsole errorがないこと

---

## 27. 既知の制約

- **`app_settings.daily_caffeine_goal_mg`は現在の目標値のみを保持し、過去の目標値の履歴は保持しない。** 連続達成日数の計算では、現在設定されている目標値を過去の日付にも遡って適用する。そのため、目標値を変更すると過去の日付の達成判定が変わり、連続達成日数の表示が変化する場合がある
- 連続達成日数の遡り判定に業務上の固定上限は設けていないが、無限ループ防止のための安全装置（約270年分に相当する反復回数の上限）を実装に含める。通常利用でこの上限に到達することはない
- 同時保存の競合制御、`caffeine_records`のRLSがMVP/デモ用途の暫定構成であること等、Version 1.0〜1.3から引き続く制約は変更なし
