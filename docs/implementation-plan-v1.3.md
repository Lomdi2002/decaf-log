# Decaf Log Version 1.3 実装計画

「日別カフェイン摂取量グラフ」の実装計画。`docs/requirements.md`（Version 1.3詳細仕様・受け入れ条件）と `docs/screen-design.md`（§67〜§72）で確定した仕様に基づく。

**この時点ではまだソースコード・`package.json`への変更は行っていない。** 本書は実装前の計画のみを示す。

- 作成日: 2026-09-13
- 対象: Version 1.3「日別カフェイン摂取量グラフ」のみ（Version 1.4「連続達成日数」は対象外）
- ブランチ：`feature/v1.3-daily-chart`

---

## 0. 重要な制約（確認済み）

- グラフは`/history`にのみ追加する。`DashboardPage`には追加しない
- 今日を含む直近7日間固定とする（期間切替UIなし）
- 記録がない日は0mgとして表示する。7日間すべて0mgでもグラフを表示する
- 日付判定はブラウザのローカルタイムゾーン基準とする。UTC文字列の単純切り出しで判定しない
- グラフはRechartsの`BarChart`を使用する。Tooltipで各日のmg値を確認できるようにする
- 目標値ラインは表示しない。Y軸は自動スケール
- Version 1.4の連続達成日数は実装しない
- 新しいDBテーブル・カラムを追加しない。Supabase RLS / GRANTを変更しない。Supabase migrationを作成しない
- Recharts以外の主要ライブラリを追加しない
- 既存Version 1.0〜1.2機能を壊さない

---

## 1. Version 1.3で実装する機能

- `/history`（履歴画面）に日別カフェイン摂取量グラフを追加（FR-009）
- 今日を含む直近7日間（今日−6日 〜 今日）を横軸とした棒グラフ
- `caffeine_records`をブラウザのローカルタイムゾーンの暦日ごとに集計し、各日の合計mgを縦軸に表示
- 同じ日の複数記録は合算する
- 記録がない日は0mgとして表示する（7日分すべてに対応するバーを必ず生成）
- 記録が1件もない場合でも、7日分すべて0mgのグラフを表示する
- Tooltipで各日の実際のmg値を確認できる
- Y軸はデータに応じた自動スケール（目標値に合わせて固定しない）
- 履歴一覧の既存Empty状態（「まだ記録がありません。」）はグラフの有無に関わらず維持する

---

## 2. Version 1.3で実装しない機能

- Version 1.4「連続達成日数」
- `DashboardPage`へのグラフ追加
- 期間切替UI（14日・30日表示など）
- 目標値（`daily_caffeine_goal_mg`）のグラフ上への重ね合わせ表示
- `caffeine_records` / `app_settings` のDB構造変更
- Supabase RLS / GRANTの変更、Supabase migrationの新規作成
- Recharts以外の新しいライブラリの追加
- `RecordForm.jsx`, `RecordList.jsx`, `RecordItem.jsx`, `SettingsForm.jsx`, `SettingsPage.jsx`, `BottomNavigation.jsx`, `DashboardPage.jsx`, `GoalProgress.jsx`, `goalProgress.js` への変更

---

## 3. 今日を含む直近7日間の日付生成ロジック

`src/lib/dailyTotals.js`に`getLastNDates(n, referenceDate = new Date())`を実装する。

```js
export function getLastNDates(n, referenceDate = new Date()) {
  const dates = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const date = new Date(referenceDate)
    date.setDate(date.getDate() - i)
    dates.push(date)
  }
  return dates
}
```

- `Date`の`setDate`/`getDate`はローカルタイムゾーンで動作するため、月またぎ・年またぎも正しく扱える
- `i`を`n - 1`から`0`まで減らすことで、「古い日付 → 新しい日付（今日）」の順に並んだ配列になる
- `referenceDate`を引数にすることで、テスト時に「今日」を固定して境界値を検証できるようにする

---

## 4. `consumed_at`を使った日別集計ロジック

`dailyTotals.js`に`buildDailyTotals(records, options)`を実装する。

```js
import { getLocalDateKey } from './dateUtils'

export function buildDailyTotals(records, { days = 7, referenceDate = new Date() } = {}) {
  const dates = getLastNDates(days, referenceDate)
  const totalsByKey = new Map(dates.map((date) => [getLocalDateKey(date), 0]))

  records.forEach((record) => {
    const key = getLocalDateKey(record.consumedAt)
    if (totalsByKey.has(key)) {
      totalsByKey.set(key, totalsByKey.get(key) + record.caffeineMg)
    }
  })

  return dates.map((date) => {
    const key = getLocalDateKey(date)
    return {
      dateKey: key,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      totalMg: totalsByKey.get(key),
    }
  })
}
```

- 期間外（8日以上前など）の記録は`totalsByKey.has(key)`が`false`になるため、集計から自然に除外される
- 戻り値は`DailyChart`にそのまま渡せる形（`{ dateKey, label, totalMg }`の配列、7件固定）

---

## 5. 同じ日の複数記録の合算方法

`buildDailyTotals`内の`totalsByKey`（`Map`）に、同じ`dateKey`を持つ記録の`caffeineMg`を`records.forEach`のループで加算していくことで合算する。記録の並び順には依存しない（`fetchRecords()`はすでに`consumed_at`降順で返すが、集計処理自体は順序に依存しない実装にする）。

---

## 6. 記録がない日の0mg補完方法

`totalsByKey`を`getLastNDates`で生成した7日分の`dateKey`で**あらかじめ0初期化**しておくことで、対応する記録が1件もない日もMapに`0`として存在する。records側のループでは該当する日が存在する場合のみ加算するため、記録がない日は初期値の`0`のまま残る。

これにより「7日分の日付データを必ず生成し、記録がない日は0mgとする」という要件を、特別な分岐なしに自然に満たす。

---

## 7. ローカルタイムゾーンの扱い

`src/lib/dateUtils.js`に`getLocalDateKey(dateInput)`を追加する。

```js
export function getLocalDateKey(dateInput) {
  const date = new Date(dateInput)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}
```

- 既存の`formatDate`・`isToday`と同じく、`getFullYear`/`getMonth`/`getDate`のみを使用し、`toISOString()`によるUTC文字列の切り出しは行わない
- `getLastNDates`（§3）・`buildDailyTotals`（§4）はいずれも、この`getLocalDateKey`を通じて日付を比較するため、集計全体が一貫してローカルタイムゾーン基準になる

---

## 8. Recharts BarChartの実装方針

`src/components/DailyChart.jsx`を新規実装する。Tooltipの表示整形は、コンポーネント内のinline関数ではなく`src/lib/dailyTotals.js`の独立した純粋関数`formatCaffeineTooltip`として実装し、テスト可能にする（§9）。

```jsx
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCaffeineTooltip } from '../lib/dailyTotals'

function DailyChart({ data }) {
  return (
    <div className="daily-chart">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis width={40} tick={{ fontSize: 12 }} />
          <Tooltip formatter={formatCaffeineTooltip} />
          <Bar
            dataKey="totalMg"
            fill="#6f4e37"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default DailyChart
```

- `ResponsiveContainer`で幅を`100%`にすることで、スマートフォン幅でも横スクロールが発生しないようにする（固定pxの幅は指定しない）
- 高さは固定（200px程度）とし、実装時にモバイル表示を見ながら微調整してよい
- バーの色は既存のUIカラー（`#6f4e37`、既存の`.summary-value`等と同系色）に合わせる
- 目標値ライン（`ReferenceLine`等）は追加しない
- **`Bar`には`isAnimationActive={false}`を指定する。** Version 1.3では高度なアニメーションは不要であり、シンプルなUIを維持するとともに、アニメーションに起因するテストの不安定化（描画タイミング待ちなど）を避けるため

---

## 9. Tooltipの実装方針

Tooltipの表示整形は、`DailyChart.jsx`内のinline関数ではなく、`src/lib/dailyTotals.js`にエクスポートする独立した純粋関数`formatCaffeineTooltip(value)`として実装する。

```js
// src/lib/dailyTotals.js
export function formatCaffeineTooltip(value) {
  // 集計時の浮動小数点演算の誤差（例: 0.1 + 0.2 = 0.30000000000000004）が
  // そのまま画面に表示されないよう、小数第1位に丸める。
  const rounded = Math.round(value * 10) / 10
  return [`${rounded}mg`, 'カフェイン摂取量']
}
```

`DailyChart.jsx`側は、Rechartsの`<Tooltip formatter={formatCaffeineTooltip} />`としてこの関数をそのまま渡す（§8参照）。

- PC：バーにマウスホバーでTooltipが表示される（Recharts標準機能）
- スマートフォン：タップでTooltipが表示される（Rechartsは標準でタッチイベントに対応している）
- 追加のタッチイベントハンドリングは実装しない（Recharts標準の挙動に任せる）
- `formatCaffeineTooltip`はReact・Rechartsに依存しない純粋関数のため、`TEST-308`ではRechartsやDOMを介さず、関数を直接呼び出して戻り値を検証する（§16）

---

## 10. Y軸自動スケールの扱い

`<YAxis>`に`domain`プロップを指定しない。これによりRechartsのデフォルト動作（データの最小値・最大値に応じた自動スケール）になる。

目標値（`daily_caffeine_goal_mg`）を使ってY軸の最大値を固定する処理は実装しない（Version 1.3のスコープ外。§2参照）。

---

## 11. Loading / Error / Empty状態

グラフは`HistoryPage`が**既に取得済みの`records`**（`fetchRecords()`の結果）から計算するため、グラフ専用の独立したLoading/Error状態は不要とする（Version 1.2の目標値取得のような別データソースの取得は発生しない）。

- `isLoading`が`true`の間：既存通り「読み込み中...」を表示し、グラフ・一覧とも表示しない（**変更しない**）
- `loadError`がある場合：既存通りError表示のみとし、グラフ・一覧とも表示しない（**変更しない**）
- 上記のいずれでもない場合：**`records`の件数に関わらず、常にグラフを表示する**（§0の「7日間すべて0mgでもグラフを表示する」要件のため）
  - `records.length === 0`の場合：グラフ（7日分すべて0mg）を表示した上で、既存のEmpty状態メッセージ・CTAをそのまま表示する（**一覧側のEmpty表示ロジックは変更しない**）
  - `records.length > 0`の場合：グラフと`RecordList`をともに表示する

---

## 12. 作成するファイル

```
src/lib/dailyTotals.js               # getLastNDates, buildDailyTotals, formatCaffeineTooltip
src/lib/dailyTotals.test.js
src/components/DailyChart.jsx        # Rechartsのラッパーコンポーネント
src/components/DailyChart.test.jsx
```

---

## 13. 変更するファイル

```
src/lib/dateUtils.js              # getLocalDateKey を追加
src/lib/dateUtils.test.js          # getLocalDateKey のテストを追加
src/pages/HistoryPage.jsx           # buildDailyTotals呼び出しとDailyChart表示を追加
src/pages/HistoryPage.test.jsx      # グラフ表示・0mg補完・Empty状態併存のテストを追加
src/App.css                          # グラフ用のコンテナスタイルを追加
package.json / package-lock.json      # recharts を追加（§14）
```

`RecordForm.jsx`, `RecordList.jsx`, `RecordItem.jsx`, `SettingsForm.jsx`, `SettingsPage.jsx`, `BottomNavigation.jsx`, `App.jsx`, `DashboardPage.jsx`, `DashboardPage.test.jsx`, `GoalProgress.jsx`, `goalProgress.js`, `caffeineRecords.js`, `appSettings.js`, `supabaseClient.js`, `supabase/schema.sql`, `supabase/migrations/` はいずれも変更しない。

---

## 14. Recharts導入による`package.json` / `package-lock.json`変更

### React 19との互換性確認（実施済み）

現時点（2026-09-13）でnpmレジストリを確認したところ、Rechartsの最新安定版は`3.10.1`であり、`peerDependencies`は以下の通り。

```text
react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0
react-dom: ^16.0.0 || ^17.0.0 || ^18.0.0 || ^19.0.0
react-is: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0
```

本プロジェクトの現在のReactバージョン（`^19.2.8`）は`^19.0.0`の範囲に含まれるため、**重大な非互換は確認されなかった。** React本体・react-dom等のバージョン変更は不要と判断する。

### 変更内容

- `dependencies`に`"recharts": "^3.10.1"`（実装時点で改めて最新安定版を確認し、必要なら微調整する）を追加する
- `react-is`はRechartsの`peerDependencies`に含まれるが、`npm install`時に自動的に解決される想定（本プロジェクトの`dependencies`へ明示的に追加する新規ライブラリとしては扱わない）
- 他の依存関係（`react`, `react-dom`, `react-router-dom`, `@supabase/supabase-js`等）は変更しない
- **実際の`npm install`はまだ行っていない。** 実装着手時に改めてインストールし、`npm view recharts version`等で最新の安定版・React 19対応状況を再確認する。もし実装時点で重大な非互換（例：peerDependenciesがReact 19を含まなくなっている等）が見つかった場合は、Reactやその他の主要ライブラリのバージョンを勝手に変更せず、一度作業を止めて報告する

---

## 15. 実装順序

各ステップは「実装 → 関連テスト作成・実行 → lint/test確認 → 次の機能」の順で進める（Version 1.0〜1.2と同じ方針）。

1. `src/lib/dateUtils.js`に`getLocalDateKey`を追加
   → 関連テスト（§16のTEST-301相当）
   → `lint`/`test`確認
2. Rechartsをインストールする（`npm install recharts@<確認済みバージョン>`）。React 19との互換性を再確認し、問題があれば一度停止して報告する
   → `npm run lint` / `npm run test` / `npm run build` で依存追加のみの状態が壊れていないことを確認
3. `src/lib/dailyTotals.js`（`getLastNDates`, `buildDailyTotals`）を実装
   → 関連テスト（§16のTEST-302〜308相当：7日分生成、複数記録合算、0mg補完、期間外除外、記録0件時の全日0mg、Tooltip整形関数の丸め）
   → `lint`/`test`確認
4. `src/components/DailyChart.jsx`を実装
   → 関連テスト（§16のTEST-309相当。Rechartsの実描画には依存せず、渡されるpropsを検証する）
   → `lint`/`test`確認
5. `HistoryPage.jsx`にグラフを統合（既存のLoading/Error/Empty分岐に追加するのみ）
   → `HistoryPage.test.jsx`を更新（§16のTEST-310〜313相当）
   → `lint`/`test`確認
6. Version 1.0〜1.2の既存テスト（77件）をすべて再実行し、回帰がないことを確認（§17）
7. `npm run test` / `npm run lint` / `npm run build` を実行し、すべて成功することを確認する（§20）
8. Version 1.3の変更をcommitする
9. `feature/v1.3-daily-chart` をGitHubへpushする（§21）
10. Vercel Preview Deploymentが生成されたことを確認する（§22）。**Version 1.3はDB変更が不要なため、Version 1.2のときと同様、push直後のPreviewでそのまま動作確認を行える**
11. Version 1.3受け入れ条件（§23）を確認する
12. Version 1.0〜1.2の既存機能を再確認する（§17、§24）
13. 問題がなければ、必要に応じてPRを作成した上で`main`へマージする（§24）
14. `main`へのマージにより、VercelがProduction Deploymentを自動実行する
15. Production環境で最終スモークテストを実施する（§25）

---

## 16. Version 1.3のテストケース

### `dateUtils.js` / `dailyTotals.js`（ロジック単体テスト）

| テストID | 内容 |
| --- | --- |
| TEST-301 | `getLocalDateKey`がローカルタイムゾーン基準で`"YYYY-MM-DD"`形式のキーを返す |
| TEST-302 | `getLastNDates(7, 基準日)`が、基準日を含む直近7日分を「古い→新しい」の順で返す |
| TEST-303 | `buildDailyTotals`が単一記録を正しい日に集計する |
| TEST-304 | 同じ日の複数記録が合算される |
| TEST-305 | 記録がない日は`totalMg: 0`になる |
| TEST-306 | 直近7日間に記録が1件もない場合でも、7件（すべて`totalMg: 0`）が返る |
| TEST-307 | 直近7日間より前（8日前以上）の記録は集計に含まれない |
| TEST-308 | `formatCaffeineTooltip`が正しく「◯◯mg」形式の文字列を返す。浮動小数点演算の誤差（例：`0.30000000000000004`）がそのまま返らず、丸められていることを確認する |

### `DailyChart.jsx` / `HistoryPage.jsx`（表示テスト）

**方針：** Rechartsが内部で生成するSVG要素数やBar DOMの実描画には依存しない。`ResponsiveContainer`はjsdom環境でサイズ取得が不安定になり得ること、また0mgのデータは高さ0のBarになり存在確認がしづらいことが理由。確認したいのは「`DailyChart`へ7日分のデータが渡されること」「7日分の日付データが存在すること」「`HistoryPage`でグラフコンポーネントが表示されること」を中心とする。必要な場合はテストファイル内でのみ`recharts`（または`DailyChart`）をモックし、Productionコード（`DailyChart.jsx`本体）はテストのために複雑化・分岐させない。

| テストID | 内容 |
| --- | --- |
| TEST-309 | `DailyChart`に渡される`data`が7件で、各要素が`dateKey` / `label` / `totalMg`を持つことを確認する（`recharts`は実描画せず、テスト内でモックしたダミーコンポーネントに渡されたpropsを検証する） |
| TEST-310 | `/history`で`DailyChart`（グラフ）コンポーネントが表示されることを確認する（`HistoryPage.test.jsx`で`../components/DailyChart`をモックし、モック関数が呼ばれた・対応するテスト用要素が描画されたことを確認する） |
| TEST-311 | 記録がある場合、`/history`にグラフと記録一覧の両方が表示される |
| TEST-312 | 記録が1件もない場合でも、グラフ用に7日分のデータが渡され、かつ既存のEmpty状態（「まだ記録がありません。」）も表示される |
| TEST-313 | 取得失敗時は、既存通りError状態のみが表示され、グラフ（`DailyChart`）は表示されない（回帰確認） |

`DashboardPage`にグラフが追加されていないことは、既存の`DashboardPage.test.jsx`に変更を加えないこと自体で担保する（§17）。

---

## 17. Version 1.2以前の回帰テスト

- 既存の77件のテスト（Version 1.0の27件 + Version 1.1の27件 + Version 1.2の23件）をすべて再実行し、全件成功することを確認する
- `RecordForm.jsx`, `RecordList.jsx`, `RecordItem.jsx`, `caffeineRecords.js`（Version 1.0）、`SettingsForm.jsx`, `SettingsPage.jsx`, `appSettings.js`（Version 1.1）、`DashboardPage.jsx`, `GoalProgress.jsx`, `goalProgress.js`（Version 1.2）はいずれも無変更のため、対応するテストの内容も変更しない
- `HistoryPage.test.jsx`はグラフ追加に伴い更新するが、既存の「Loading/Error/Empty状態」「削除処理（TEST-009相当）」のテスト内容自体は変更しない
- `dateUtils.test.js`は`getLocalDateKey`のテストを追加するが、既存の`formatDate`/`formatTime`/`isToday`/`toDatetimeLocalValue`のテストは変更しない

---

## 18. DB変更が不要であることの確認

Version 1.3は表示の追加のみで完結し、DBスキーマの変更は不要である。

- グラフに必要な値（`consumed_at`, `caffeine_mg`）は`caffeine_records`に既に存在する
- 新しいテーブル・カラムの追加は行わない
- `supabase/schema.sql`・`supabase/migrations/`への追記は行わない（Version 1.2までの内容のまま）
- Supabase本番DBへは一切アクセス・変更しない

---

## 19. RLS / GRANT変更が不要であることの確認

- グラフは`caffeine_records`に対する既存の`fetchRecords()`（`SELECT`）の結果をそのまま再利用するだけで、新しいSupabase操作は発生しない
- `app_settings`に対する操作は発生しない（目標値ラインを表示しないため）
- 既存のRLSポリシー・GRANT文（`supabase/schema.sql`）には一切変更を加えない

---

## 20. test / lint / build確認

- 各実装ステップ後（§15参照）に`npm run test`と`npm run lint`を実行し、失敗があればその場で修正する
- 実装完了後、最終確認として以下をすべて実行し、成功を確認する

```bash
npm run test
npm run lint
npm run build
```

---

## 21. GitHub feature branchへのpush

- ブランチ：`feature/v1.3-daily-chart`
- `main`を直接変更せず、feature branch上で実装・コミットする
- test/lint/build成功後、featureブランチをGitHubへpushする
- Version 1.1・1.2のときと同様、PRを先に作成する必要はない。push後のPreview確認・受け入れ条件確認・回帰確認が完了したのち、必要に応じてPRを作成して`main`へマージする

---

## 22. Vercel Preview Deployment確認

- GitHubへpushすると、Vercelが自動的にPreview Deploymentを作成する
- Version 1.3はDBスキーマ変更・`app_settings`への操作が不要なため、Version 1.1のような「migration適用待ち」や、Version 1.2で行った「目標値を一時的に変更して元に戻す」手順は不要である
- Preview URL上で以下を確認する
  - `/history`に日別グラフが表示される（今日を含む直近7日間、記録がない日は0mg）
  - Tooltipで各日のmg値を確認できる
  - 記録の追加・削除後、グラフが正しく再計算されること
  - 既存の`/`, `/record`, `/settings`に影響がないこと（特に`DashboardPage`にグラフが追加されていないこと）

---

## 23. Version 1.3受け入れ条件

`docs/requirements.md`・`docs/screen-design.md`に記載済みの内容を転記する。

- [ ] `/history`に日別カフェイン摂取量グラフが表示される
- [ ] ダッシュボード（`/`）にはVersion 1.3のグラフが表示されない
- [ ] グラフには今日を含む直近7日間（今日−6日 〜 今日）が表示される
- [ ] 各日の合計値は、ローカルタイムゾーンの暦日基準で正しく集計されている
- [ ] 直近7日間のうち記録がない日は0mgとして表示される
- [ ] 直近7日間に記録が1件もない場合でも、7日分がすべて0mgのグラフとして表示される
- [ ] Tooltip等で各日の実際のmg値を確認できる
- [ ] 履歴一覧の既存Empty状態（「まだ記録がありません。」）に変更がない
- [ ] 目標値ライン（`daily_caffeine_goal_mg`）はグラフ上に表示されない
- [ ] Y軸は目標値に合わせて固定されておらず、データに応じた自動スケールになっている
- [ ] `caffeine_records`・`app_settings`のDB構造・RLS・GRANTに変更がない
- [ ] 既存のVersion 1.0〜1.2機能（記録・履歴・削除・今日の合計・設定・目標進捗）に影響がない
- [ ] テストが成功する
- [ ] lintが成功する
- [ ] production buildが成功する

---

## 24. mainへmergeする前の最終確認項目

1. [ ] `npm run test` / `npm run lint` / `npm run build` がすべて成功している
2. [ ] `caffeine_records` / `app_settings` のDB定義・RLS・GRANTに差分がないことを確認済み（`supabase/schema.sql`, `supabase/migrations/`に変更なし）
3. [ ] `DashboardPage.jsx`, `GoalProgress.jsx`, `goalProgress.js`, `RecordForm.jsx`, `SettingsForm.jsx`, `SettingsPage.jsx`, `BottomNavigation.jsx` に差分がないことを確認済み
4. [ ] Version 1.4相当（連続達成日数等）のコードが混入していないことを確認済み
5. [ ] `package.json` / `package-lock.json`の差分が`recharts`関連のみであることを確認済み
6. [ ] `feature/v1.3-daily-chart` をGitHubへpush済みで、Vercel Preview Deploymentが生成されていることを確認済み
7. [ ] Vercel Preview上でVersion 1.3の表示（通常・記録なし7日間・記録追加後の再計算）を確認済み
8. [ ] §23のVersion 1.3受け入れ条件をすべて満たしている
9. [ ] Version 1.0〜1.2の既存77件のテストを含め、回帰確認が成功している
10. [ ] README等ドキュメントの更新要否を確認済み

上記すべてを満たしたら、必要に応じてPRを作成し、ユーザーの承認を得てから`main`へマージする。マージにより、Vercelが自動的にProduction Deploymentを実行する。

---

## 25. Production環境での最終スモークテスト

`main`マージ・Production Deployment完了後、本番URL上で以下を確認する。

- `/history`に日別グラフが表示される（今日を含む直近7日間）
- 記録がない日は0mgとして表示される
- Tooltipで各日のmg値を確認できる
- 新しく記録を追加・削除した際に、グラフが正しく再計算される
- 既存の`/`, `/record`, `/settings`の動作に影響がないこと（記録・履歴・削除・今日の合計・目標設定・目標進捗）
- ダッシュボード（`/`）にグラフが表示されていないこと
- 各ページの直接URLアクセス・ブラウザ更新が引き続き問題ないこと
- 重大なconsole errorがないこと
