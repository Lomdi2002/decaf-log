# Decaf Log Version 1.2 実装計画

「目標進捗プログレスバー」の実装計画。`docs/requirements.md`（Version 1.2詳細仕様・受け入れ条件）と `docs/screen-design.md`（§57〜§66）で確定した仕様に基づく。

**この時点ではまだソースコードへの変更は行っていない。** 本書は実装前の計画のみを示す。

- 作成日: 2026-09-12
- 対象: Version 1.2「目標進捗プログレスバー」のみ（Version 1.3「日別カフェイン摂取量グラフ」は対象外）
- ブランチ：`feature/v1.2-goal-progress`

---

## 0. 重要な制約（確認済み）

- Version 1.3のグラフは実装しない
- `DashboardPage`以外へ不要な表示変更を加えない
- `caffeine_records`のDB構造を変更しない
- `app_settings`のDB構造を変更しない
- Supabase RLS / GRANTを変更しない
- Supabase migrationは作成しない（DB変更が不要なため。§14・§15参照）
- 新しい主要ライブラリを追加しない（React Query等も追加しない）
- 既存のVersion 1.0 / 1.1機能を壊さない

---

## 1. Version 1.2で実装する機能

- ダッシュボード（`/`）に目標進捗表示を追加（FR-008）
- 今日のカフェイン合計（既存のFR-005ロジック）と、`app_settings.daily_caffeine_goal_mg`（Version 1.1で追加済み、`src/lib/appSettings.js`の`fetchGoal()`を再利用）を用いて進捗を計算・表示する
- 目標未設定（`NULL`）時：進捗バーを表示せず、「1日の目標が設定されていません。」と「目標を設定する」（`/settings`への導線）を表示する
- 目標が1以上の場合：今日の摂取量・目標値・進捗率（%）・残り摂取可能量（mg）を表示する
- 目標に到達した場合：「目標上限に達しました」と表示する
- 目標を超過した場合：実際の進捗率（例：125%）と「目標を◯mg超えています」を表示し、警告状態の配色にする（バーの視覚的な幅は100%で頭打ち）
- 目標が0mgの場合：0除算をせず、`NaN`/`Infinity`を表示しない。今日の摂取量が0mgなら「カフェイン摂取なし」相当、1mg以上なら「目標を超えています」と表示し、いずれも進捗率（%）は表示しない
- 目標値の取得中はダッシュボード全体をLoading状態にせず、今日の合計・最近の記録は記録取得完了後に通常表示し、目標進捗部分のみ「読み込み中...」と表示する
- 目標値の取得に失敗した場合：ダッシュボード全体をError状態にせず、今日の合計・最近の記録は通常表示のまま、目標進捗部分のみ「目標を取得できませんでした。」と表示する
- 進捗表示は「達成率」ではなく「1日のカフェイン目標上限にどれだけ近づいているか」を表すものとして実装する（配色は100%未満＝通常、100%以上＝警告のみのシンプルな区別）
- 進捗バー表示時には、可能な範囲で`role="progressbar"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`を付与する（アクセシビリティ対応）

---

## 2. Version 1.2で実装しない機能

- Version 1.3「日別カフェイン摂取量グラフ」
- ダッシュボードからの目標値の変更（表示のみ。変更は引き続き`/settings`で行う）
- `caffeine_records` / `app_settings` のDB構造変更
- Supabase RLS / GRANTの変更、Supabase migrationの新規作成
- React Query等の新しいデータ取得・状態管理ライブラリの追加
- `RecordForm.jsx`, `RecordList.jsx`, `RecordItem.jsx`, `HistoryPage.jsx`, `SettingsForm.jsx`, `SettingsPage.jsx`, `BottomNavigation.jsx` への変更
- 連続達成日数、飲み物プリセット、記録編集、認証など、MVP対象外機能（`docs/requirements.md` §7）

---

## 3. 進捗率の計算ロジック

新規の純粋関数 `calculateGoalProgress(todayTotalMg, goalMg)` を `src/lib/goalProgress.js` に実装する（副作用なし、DOM非依存でテストしやすくするため）。

```js
export function calculateGoalProgress(todayTotalMg, goalMg) {
  if (goalMg === null || goalMg === undefined) {
    return { status: 'unset' }
  }

  if (goalMg === 0) {
    return todayTotalMg > 0
      ? { status: 'exceeded-zero' }
      : { status: 'within-zero' }
  }

  // percent / barWidthPercent は表示専用の値であり、四捨五入して算出する。
  // status（normal / reached / exceeded）の判定には使わない。
  const percent = Math.round((todayTotalMg / goalMg) * 100)
  const barWidthPercent = Math.min(percent, 100)

  // statusは実際のmg値同士を比較して判定する。percentの丸め誤差により
  // 「実際は未到達/超過なのにreached扱いになる」ことを防ぐため
  // （例: 199.6mg/200mg → 99.8% → 丸めで100%だが実際は未到達 → normal
  // 　　 200.4mg/200mg → 100.2% → 丸めで100%だが実際は超過 → exceeded）。
  if (todayTotalMg < goalMg) {
    return {
      status: 'normal',
      percent,
      barWidthPercent,
      remainingMg: goalMg - todayTotalMg,
    }
  }

  if (todayTotalMg === goalMg) {
    return { status: 'reached', percent, barWidthPercent }
  }

  return {
    status: 'exceeded',
    percent,
    barWidthPercent,
    overMg: todayTotalMg - goalMg,
  }
}
```

戻り値の`status`は次のいずれかを取る：`unset` / `within-zero` / `exceeded-zero` / `normal` / `reached` / `exceeded`。`GoalProgress.jsx`はこの`status`に応じて表示を出し分ける（表示ロジックとの分離）。

**status判定は`percent`（丸め後の表示用の値）ではなく、`todayTotalMg`と`goalMg`の実際の値の比較で行う。** `percent`・`barWidthPercent`はあくまで画面表示用として、status判定の後に別途算出する。

0での除算が発生する分岐（`goalMg === 0`）を数値計算より前に判定するため、`NaN`・`Infinity`は原理的に発生しない。

---

## 4. 目標未設定（`NULL`）の処理

`fetchGoal()`が`null`を返した場合、`calculateGoalProgress`は`{ status: 'unset' }`を返す。

`GoalProgress`コンポーネントは`status === 'unset'`のとき、進捗バーを描画せず、以下を表示する。

```text
1日の目標が設定されていません。

目標を設定する
```

「目標を設定する」は`react-router-dom`の`Link`で`/settings`へ遷移する（新しい画面・ルートは追加しない）。

---

## 5. 目標0mgの処理

`goalMg === 0`を除算より前に分岐させ、0除算を回避する。

- `todayTotalMg === 0` → `status: 'within-zero'` → 「カフェイン摂取なし」相当の表示（進捗率(%)は表示しない）
- `todayTotalMg > 0` → `status: 'exceeded-zero'` → 「目標を超えています」の表示（進捗率(%)は表示しない）

いずれの場合も進捗バー・パーセント表示は行わない（0mgという目標に対して意味のある割合を計算できないため）。

---

## 6. 100%到達・100%超過時の処理

- `todayTotalMg === goalMg`（`status: 'reached'`）→ 「目標上限に達しました」と表示。進捗バーは満タン（100%）表示、通常配色と区別できる警告配色にする
- `todayTotalMg > goalMg`（`status: 'exceeded'`）→ 実際の`percent`（例：125%）をそのまま表示し、`overMg`（例：250 - 200 = 50mg）を使って「目標を50mg超えています」と表示する。バーの視覚的な幅は`barWidthPercent`（`Math.min(percent, 100)`）を使うため、常に100%で頭打ちになる
- `status`が`reached`または`exceeded`（＝100%以上）のときは警告配色、`normal`（100%未満）のときは通常配色とする（2状態のみのシンプルな区別。CSSクラスの切り替えで対応し、複雑なアニメーションは実装しない）
- **注意：** `status`の判定は`percent`（丸め後の値）ではなく`todayTotalMg`と`goalMg`の実際の値で行うため、`percent`の表示が100%であっても`status`が`normal`のまま（例：199.6mg/200mg → 表示は「100%」だが`status: 'normal'`）というケースが起こり得る。この場合、表示上の警告色切り替え・「到達」文言表示は行わず、あくまで`status`に基づいて判定する（§3参照）

---

## 7. 残り摂取可能量の計算方法

- `status === 'normal'`（100%未満）のときのみ、`remainingMg = goalMg - todayTotalMg` を計算し「あと◯mg」として表示する
- `status === 'reached'`（100%到達）のときは「あと◯mg」は表示せず、「目標上限に達しました」の文言のみ表示する（`remainingMg`は0になるため表示する意味がないため）
- `status === 'exceeded'`（100%超過）のときは「あと◯mg」の代わりに`overMg = todayTotalMg - goalMg`を使った超過量の文言を表示する
- `status`が`unset` / `within-zero` / `exceeded-zero`のときは残り摂取可能量そのものを計算・表示しない（目標未設定または0mg目標のため意味を持たない）

---

## 8. 目標値取得中のLoading・取得失敗時の部分Error処理

`DashboardPage`では、`fetchRecords()`と`fetchGoal()`を**Loading・Errorともに独立して扱う**（どちらか一方の状態が他方の表示をブロックしないようにする）。

実装方針：

```js
const [records, setRecords] = useState([])
const [recordsLoading, setRecordsLoading] = useState(true)
const [recordsError, setRecordsError] = useState('')

const [goal, setGoal] = useState(null)
const [goalLoading, setGoalLoading] = useState(true)
const [goalError, setGoalError] = useState('')
```

- `fetchRecords()`が失敗した場合：既存のVersion 1.0の挙動を維持し、ダッシュボード全体を「データの取得に失敗しました。」のError状態にする（**この挙動は変更しない**）
- `recordsLoading`が`true`の間：既存のVersion 1.0の挙動を維持し、ダッシュボード全体を「読み込み中...」表示にする（**この挙動は変更しない**）
- `recordsLoading`が`false`かつ`recordsError`がない場合、目標進捗部分は`goalLoading`/`goalError`/`goal`の状態に応じて次のように独立して表示する（「今日のカフェイン合計」「最近の記録」の表示・タイミングには一切影響させない）
  - `goalLoading`が`true`の間：目標進捗部分のみ「読み込み中...」を表示する
  - `goalError`がある場合：目標進捗部分のみ「目標を取得できませんでした。」を表示する
  - どちらでもない場合：`calculateGoalProgress(todayTotalMg, goal)`の結果に応じた表示（§4〜§7）を行う
- 2つの取得は`Promise.allSettled`等を使わず、それぞれ独立した`useEffect`/`useCallback`（または1つの`useEffect`内で個別に`try/catch`する形）で管理し、片方の状態（Loading/Error）が他方の状態更新・表示タイミングを妨げないようにする

---

## 9. 作成するファイル

```
src/lib/goalProgress.js              # calculateGoalProgress（純粋関数）
src/lib/goalProgress.test.js
src/components/GoalProgress.jsx      # 進捗表示コンポーネント（role="progressbar"等のaria属性を含む）
src/components/GoalProgress.test.jsx
```

---

## 10. 変更するファイル

```
src/pages/DashboardPage.jsx      # fetchGoal()の呼び出し追加、GoalProgressの表示、
                                   # goal取得エラーを独立してハンドリング
src/pages/DashboardPage.test.jsx  # 目標進捗表示・部分Errorのテストを追加
src/App.css                       # 進捗バー・警告状態のスタイルを追加
```

`RecordForm.jsx`, `RecordList.jsx`, `RecordItem.jsx`, `HistoryPage.jsx`, `SettingsForm.jsx`, `SettingsPage.jsx`, `BottomNavigation.jsx`, `App.jsx`, `caffeineRecords.js`, `appSettings.js`, `dateUtils.js`, `supabaseClient.js`, `supabase/schema.sql`, `package.json` はいずれも変更しない。

---

## 11. 実装順序

各ステップは「実装 → 関連テスト作成・実行 → lint/test確認 → 次の機能」の順で進める（Version 1.0・1.1と同じ方針）。

1. `src/lib/goalProgress.js`（`calculateGoalProgress`）を実装
   → 関連テスト（§12のTEST-201〜207, 216〜217：unset/0mg/通常/到達/超過/NaN・Infinity非発生・境界値の確認）
   → `lint`/`test`確認
2. `src/components/GoalProgress.jsx`を実装（`calculateGoalProgress`の結果に応じた表示の出し分け、`/settings`への導線）
   → 関連テスト
   → `lint`/`test`確認
3. `DashboardPage.jsx`に`fetchGoal()`呼び出しと`GoalProgress`表示を追加し、目標取得のLoading・Errorを記録取得のLoading・Errorと独立してハンドリングする（§8）
   → `DashboardPage.test.jsx`を更新（目標進捗の表示、部分Errorのテストを追加）
   → `lint`/`test`確認
4. Version 1.0・Version 1.1の既存テスト（54件）をすべて再実行し、回帰がないことを確認（§13）
5. `npm run test` / `npm run lint` / `npm run build` を実行し、すべて成功することを確認する（§16）
6. Version 1.2の変更をcommitする
7. `feature/v1.2-goal-progress` をGitHubへpushする（§17）
8. Vercel Preview Deploymentが生成されたことを確認する（§18）。**DB変更が不要なため、Version 1.1のときのようにmigration適用を待つ必要はなく、push直後のPreviewでVersion 1.2の動作確認をそのまま行える**
9. Version 1.2受け入れ条件（§19）を確認する
10. Version 1.0・Version 1.1の既存機能を再確認する（§13、§20）
11. 問題がなければ、必要に応じてPRを作成した上で`main`へマージする（§20）
12. `main`へのマージにより、VercelがProduction Deploymentを自動実行する
13. Production環境で最終スモークテストを実施する（§21）

---

## 12. Version 1.2のテストケース

### `goalProgress.js`（ロジック単体テスト）

| テストID | 内容 |
| --- | --- |
| TEST-201 | 目標が`null`のとき`status: 'unset'`を返す |
| TEST-202 | 目標が0mg・今日の摂取量が0mgのとき`status: 'within-zero'`を返す |
| TEST-203 | 目標が0mg・今日の摂取量が1mg以上のとき`status: 'exceeded-zero'`を返す |
| TEST-204 | 目標200mg・今日100mgのとき`status: 'normal'`, `percent: 50`, `remainingMg: 100`を返す |
| TEST-205 | 目標200mg・今日200mgのとき`status: 'reached'`, `percent: 100`を返す |
| TEST-206 | 目標200mg・今日250mgのとき`status: 'exceeded'`, `percent: 125`, `overMg: 50`を返す |
| TEST-207 | いかなる入力の組み合わせでも戻り値に`NaN`・`Infinity`が含まれない |
| TEST-216（境界値） | 目標200mg・今日199.6mgのとき、`percent`は丸めで100になり得るが`status: 'normal'`を返す（丸め誤差でreached扱いにならないことの確認） |
| TEST-217（境界値） | 目標200mg・今日200.4mgのとき、`percent`は丸めで100になり得るが`status: 'exceeded'`を返す（丸め誤差でreached扱いにならないことの確認） |

### `GoalProgress.jsx` / `DashboardPage.jsx`（表示テスト）

| テストID | 内容 |
| --- | --- |
| TEST-208 | 目標未設定時、「1日の目標が設定されていません。」と「目標を設定する」（`/settings`リンク）が表示される |
| TEST-209 | 目標設定済み・通常時、今日の摂取量・目標値・進捗率(%)・残り摂取可能量(mg)が表示される |
| TEST-210 | 目標到達時、「目標上限に達しました」が表示される |
| TEST-211 | 目標超過時、実際の進捗率（例："125%"）と「目標を◯mg超えています」が表示され、警告状態のクラスが付与される |
| TEST-212 | 目標0mg・今日0mgのとき「カフェイン摂取なし」相当の表示になり、進捗率(%)のテキストが表示されない |
| TEST-213 | 目標0mg・今日1mg以上のとき「目標を超えています」の表示になり、進捗率(%)のテキストが表示されない |
| TEST-214 | 目標値の取得に失敗した場合、目標進捗部分のみ「目標を取得できませんでした。」と表示され、今日の合計・最近の記録は通常どおり表示される（`caffeine_records`取得は成功しているケース） |
| TEST-215 | `caffeine_records`の取得に失敗した場合、従来通りダッシュボード全体がError状態になる（既存のVersion 1.0挙動が壊れていないことの確認） |
| TEST-218 | 目標が設定済みの場合、進捗バーに`role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow`（`barWidthPercent`の値）が付与される |
| TEST-219 | 記録取得は完了し、目標取得がまだ完了していない間は、今日の合計・最近の記録が表示されつつ、目標進捗部分のみ「読み込み中...」が表示される |

---

## 13. Version 1.1以前の回帰テスト

- 既存の54件のテスト（Version 1.0の27件 + Version 1.1の27件）をすべて再実行し、全件成功することを確認する
- `RecordForm.jsx`, `RecordList.jsx`, `RecordItem.jsx`, `HistoryPage.jsx`, `caffeineRecords.js`, `dateUtils.js`（Version 1.0）、`SettingsForm.jsx`, `SettingsPage.jsx`, `appSettings.js`（Version 1.1）はいずれも無変更のため、対応するテストの内容も変更しない
- `DashboardPage.test.jsx`は目標進捗表示の追加に伴い更新するが、既存の「今日の合計計算（TEST-007相当）」「Loading/Error/Empty状態」「最近の記録の表示」のテスト内容自体は変更しない

---

## 14. DB変更が不要であることの確認

Version 1.2は表示の追加のみで完結し、DBスキーマの変更は不要である。

- 進捗計算に必要な値（今日の合計は`caffeine_records`から算出、目標値は`app_settings.daily_caffeine_goal_mg`）はVersion 1.0・1.1で既に揃っている
- 新しいテーブル・カラムの追加は行わない
- `supabase/schema.sql`・`supabase/migrations/`への追記は行わない（Version 1.1までの内容のまま）
- Supabase本番DBへは一切アクセス・変更しない

---

## 15. RLS / GRANT変更が不要であることの確認

- ダッシュボードは`app_settings`に対して`fetchGoal()`（`SELECT`）を呼び出すのみで、これはVersion 1.1で既にanonへ許可済みの権限で完結する
- `UPDATE`・`INSERT`・`DELETE`はダッシュボードから一切行わない
- `caffeine_records`に対する操作もVersion 1.0から変更しない（`fetchRecords()`のみ、既存の`SELECT`権限で完結）
- 既存のRLSポリシー・GRANT文（`supabase/schema.sql`）には一切変更を加えない

---

## 16. test / lint / build確認

- 各実装ステップ後（§11参照）に`npm run test`と`npm run lint`を実行し、失敗があればその場で修正する
- 実装完了後、最終確認として以下をすべて実行し、成功を確認する

```bash
npm run test
npm run lint
npm run build
```

---

## 17. GitHub feature branchへのpush

- ブランチ：`feature/v1.2-goal-progress`
- `main`を直接変更せず、feature branch上で実装・コミットする
- test/lint/build成功後、featureブランチをGitHubへpushする
- Version 1.1のときと同様、PRを先に作成する必要はない。push後のPreview確認・受け入れ条件確認・回帰確認が完了したのち、必要に応じてPRを作成して`main`へマージする

---

## 18. Vercel Preview Deploymentでの確認

- GitHubへpushすると、Vercelが自動的にPreview Deploymentを作成する
- **Version 1.2はDBスキーマ変更が不要なため、Version 1.1のときのようにSupabase migration適用を待つ必要がない。** push後、Preview Deploymentが生成され次第、そのままVersion 1.2の動作確認を行える
- Preview URL上で以下を確認する
  - ダッシュボードに目標進捗表示が追加されている
  - 目標未設定・通常時・到達時・超過時・0mg時それぞれの表示（実際に`/settings`で目標値を変更しながら確認する）
  - 既存の`/`, `/record`, `/history`, `/settings`に影響がないこと
- **Preview DeploymentはProductionと同じSupabaseプロジェクトを参照する**ため、Preview上で`/settings`から変更した目標値は本番Supabaseにも反映される（Version 1.1で合意済みの制約と同様）。そのため、動作確認の手順は以下の順で行う。
  1. 確認を始める前に、`/settings`で**現在設定されている目標値（本番の実際の値）を記録しておく**（未設定であれば「未設定」であることを記録する）
  2. 各状態（未設定・通常・到達・超過・0mg）を確認するため、`/settings`で目標値を一時的に変更しながらダッシュボードの表示を確認する
  3. **確認が終わったら、`/settings`で目標値を手順1で記録した元の値（または未設定）へ必ず戻す**
  4. 元に戻したことをダッシュボードで再確認する

---

## 19. Version 1.2受け入れ条件

`docs/requirements.md`・`docs/screen-design.md`に記載済みの内容を転記する。

- [ ] ダッシュボードに目標進捗が表示される
- [ ] 目標が未設定の場合、進捗バーの代わりに「1日の目標が設定されていません。」と「目標を設定する」（`/settings`への導線）が表示される
- [ ] 目標が1以上に設定されている場合、今日の摂取量・目標値・進捗率（%）・残り摂取可能量（mg）が表示される
- [ ] 進捗率が100%未満の場合、通常状態の表示になる
- [ ] 今日の摂取量が目標値と一致する場合、「目標上限に達しました」と表示される
- [ ] 今日の摂取量が目標値を超える場合、実際の進捗率（100%超の数値）と「目標を◯mg超えています」が表示され、警告状態の表示になる
- [ ] 進捗率が100%を超えても、進捗バーの視覚的な幅は100%で止まる
- [ ] 目標が0mgかつ今日の摂取量が0mgの場合、「カフェイン摂取なし」相当の表示になり、進捗率（%）は表示されない
- [ ] 目標が0mgかつ今日の摂取量が1mg以上の場合、「目標を超えています」と表示され、進捗率（%）は表示されない
- [ ] いかなる場合も、`NaN`や`Infinity`が画面に表示されない
- [ ] 目標値の取得に失敗した場合、目標進捗部分のみ「目標を取得できませんでした。」と表示され、今日の合計・最近の記録は通常どおり表示される
- [ ] 既存のVersion 1.0・Version 1.1機能（記録・履歴・削除・今日の合計・設定画面）に影響がない
- [ ] テストが成功する
- [ ] lintが成功する
- [ ] production buildが成功する

---

## 20. mainへmergeする前の最終確認項目

1. [ ] `npm run test` / `npm run lint` / `npm run build` がすべて成功している
2. [ ] `caffeine_records` / `app_settings` のDB定義・RLS・GRANTに差分がないことを確認済み（`supabase/schema.sql`, `supabase/migrations/`に変更なし）
3. [ ] `RecordForm.jsx`, `HistoryPage.jsx`, `SettingsForm.jsx`, `SettingsPage.jsx`, `BottomNavigation.jsx`, `App.jsx` に差分がないことを確認済み
4. [ ] Version 1.3相当（グラフ等）のコードが混入していないことを確認済み
5. [ ] `feature/v1.2-goal-progress` をGitHubへpush済みで、Vercel Preview Deploymentが生成されていることを確認済み
6. [ ] Vercel Preview上でVersion 1.2の全状態（未設定／通常／到達／超過／0mg／取得失敗）を確認済み
7. [ ] §19のVersion 1.2受け入れ条件をすべて満たしている
8. [ ] Version 1.0・Version 1.1の既存54件のテストを含め、回帰確認が成功している
9. [ ] README等ドキュメントの更新要否を確認済み

上記すべてを満たしたら、必要に応じてPRを作成し、ユーザーの承認を得てから`main`へマージする。マージにより、Vercelが自動的にProduction Deploymentを実行する。

---

## 21. Production環境での最終スモークテスト

`main`マージ・Production Deployment完了後、本番URL上で以下を確認する。

- ダッシュボードに目標進捗が表示される
- `/settings`で目標値を変更し、ダッシュボードの表示が正しく変化することを確認する（未設定→設定、通常→到達→超過、0mg設定時の挙動を含む）。§18と同様、確認前に現在の目標値を記録し、確認後に元の値へ戻す
- 既存の`/`, `/record`, `/history`, `/settings`の動作に影響がないこと（記録・履歴・削除・今日の合計・目標設定）
- 各ページの直接URLアクセス・ブラウザ更新が引き続き問題ないこと
- 重大なconsole errorがないこと
