# Decaf Log Version 1.6 実装計画

「カフェイン記録編集機能」の実装計画。`docs/requirements.md`（Version 1.6詳細仕様・受け入れ条件）と `docs/screen-design.md`（§86〜§90）で確定した仕様に基づく。

**この時点ではまだソースコード・Supabase本番DBへの変更は行っていない。** 本書は実装前の計画のみを示す。

- 作成日: 2026-09-14
- 対象: Version 1.6「カフェイン記録編集機能」のみ（Version 1.7以降は対象外）
- ブランチ：`feature/v1.6-record-edit`
- **Version 1.6は、これまでのVersion 1.1〜1.5とは異なり、DBの権限構成（RLS/GRANT）変更を伴う初めてのバージョンである**

---

## 0. 重要な制約（確認済み）

- 編集画面は専用ルート`/records/:id/edit`を採用する。インライン編集・モーダル編集は採用しない
- `caffeine_records`へのUPDATE権限を新たに許可する。**テーブル全体へのUPDATE権限ではなく、`drink_name`・`caffeine_mg`・`consumed_at`の3カラムに限定したカラムレベルのGRANTとし、`id`・`created_at`はanonからUPDATEできない状態を維持する。** RLSポリシーは既存のSELECT/INSERT/DELETEと同様の公開ポリシー（`using (true)` / `with check (true)`）とする。migrationを追加し、`supabase/schema.sql`にも反映する
- **認証なしでanonロールが`caffeine_records`の全行の`drink_name`・`caffeine_mg`・`consumed_at`をUPDATEできることは、MVP/個人デモ用途における既知のセキュリティ制約として明記する。** Supabase Auth・`user_id`はVersion 1.6では導入しない
- 保存成功後は`/history`へ遷移する
- Not Foundは通常の取得エラーと区別する。`fetchRecordById`は`maybeSingle()`等を用いて「0件」と「通信・取得エラー」を区別する
- `RecordForm`と編集フォームは同じバリデーションルールを使用する。`src/lib/recordValidation.js`へバリデーションロジックのみ共通化する。`RecordForm.jsx`は、既存`validate`を共通関数の利用へ置き換える範囲でのみ変更対象とする（UI・登録フロー・`handleSubmit`の基本動作・`insertRecord`の動作は大規模変更しない）
- 編集対象は`drink_name`・`caffeine_mg`・`consumed_at`の3項目のみ。`created_at`は変更しない
- `consumed_at`に未来日時禁止等の新しい制限は追加しない。新規登録と同じ既存ルールを使用する
- 日時入力の初期値・保存時変換は既存の`dateUtils.js`のユーティリティを再利用し、UTC文字列の単純な切り出しは行わない
- 編集後の反映は既存の`fetchRecords()`再取得に委ねる。`goalProgress.js`・`dailyTotals.js`・`streak.js`は変更しない
- Supabase Auth、`user_id`、編集履歴、監査ログ、未来日時禁止、Version 1.7以降の機能、`RecordForm`の大規模リファクタリングは実装しない

---

## 1. Version 1.6で実装する機能

- `/history`の各記録から「編集」導線で`/records/:id/edit`へ遷移できる（FR-012）
- 編集画面で、対象記録の飲み物名・カフェイン量・摂取日時を編集し、保存できる
- 保存成功後は`/history`へ遷移する
- キャンセルすると変更を保存せず`/history`へ戻る
- 保存処理中は二重送信を防止する
- 新規登録と同じ入力バリデーションを編集画面でも適用する
- 存在しない記録IDへアクセスした場合、Not Found状態（「指定された記録が見つかりませんでした。」＋「履歴に戻る」）を表示する
- 編集結果は履歴・今日の合計・目標進捗・日別グラフ・連続達成日数に反映される
- 既存の記録削除機能は維持する
- `caffeine_records`へのUPDATE権限（GRANT・RLSポリシー）をSupabase本番DBへ適用する

---

## 2. Version 1.6で実装しない機能

- Supabase Auth、`user_id`によるユーザー単位のアクセス制御
- 編集履歴・監査ログ
- `consumed_at`の未来日時禁止等、新規登録にはない追加バリデーション
- Version 1.7以降の機能
- `RecordForm`の大規模リファクタリング（バリデーションロジックの共通化を除く）
- 飲み物プリセット（Version 1.5）の編集画面への追加
- `caffeine_records`・`app_settings`のテーブル構造変更（カラム追加等）
- `DashboardPage.jsx`, `GoalProgress.jsx`, `goalProgress.js`, `StreakCard.jsx`, `streak.js`, `DailyChart.jsx`, `dailyTotals.js`, `SettingsForm.jsx`, `SettingsPage.jsx`, `appSettings.js`, `BottomNavigation.jsx`, `DrinkPresetPicker.jsx`, `drinkPresets.js`への変更

---

## 3. `/records/:id/edit`のルーティング

`src/App.jsx`に新しいルートを追加する。

```jsx
import EditRecordPage from './pages/EditRecordPage'
// ...
<Route path="/records/:id/edit" element={<EditRecordPage />} />
```

`EditRecordPage`は`react-router-dom`の`useParams()`で`id`を取得する。既存の4ルート（`/`, `/record`, `/history`, `/settings`）は変更しない。

---

## 4. `RecordItem`からの編集導線

`src/components/RecordItem.jsx`に、既存の「削除」ボタンと並べて「編集」リンクを追加する。

```jsx
<Link to={`/records/${record.id}/edit`} className="button button-secondary record-item-edit">
  編集
</Link>
```

既存の削除ボタン（`handleDeleteClick`、確認ダイアログ）のロジックは変更しない。スタイルは「削除」ボタンと並べて自然に配置できるよう、`App.css`に最小限のクラス（例：`.record-item-actions`）を追加する。

---

## 5. `fetchRecordById`の設計

`src/lib/caffeineRecords.js`に追加する。`maybeSingle()`を使用し、「0件（Not Found）」と「通信・取得エラー」を区別できるようにする。

```js
export async function fetchRecordById(id) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? toRecord(data) : null
}
```

- 該当行がない場合：`error`は`null`、`data`も`null`になる（`maybeSingle()`の仕様）ため、関数は`null`を返す
- 通信・取得エラーの場合：`error`が truthy になるため、そのままthrowする

---

## 6. Not Foundと通常Errorの区別

`EditRecordPage`側で、`fetchRecordById`の戻り値によって状態を分岐する。

```js
const [record, setRecord] = useState(null)
const [isLoading, setIsLoading] = useState(true)
const [loadError, setLoadError] = useState('')
const [notFound, setNotFound] = useState(false)

const loadRecord = useCallback(async () => {
  setIsLoading(true)
  setLoadError('')
  setNotFound(false)
  try {
    const data = await fetchRecordById(id)
    if (data === null) {
      setNotFound(true)
    } else {
      setRecord(data)
    }
  } catch (error) {
    console.error('記録の取得に失敗しました:', error)
    setLoadError(FETCH_ERROR_MESSAGE)
  } finally {
    setIsLoading(false)
  }
}, [id])
```

`notFound`が`true`の場合は「指定された記録が見つかりませんでした。」＋「履歴に戻る」（`/history`へのリンク）を表示し、`loadError`がある場合は既存パターンの取得エラーメッセージを表示する。両者は同時に立たない排他的な状態として扱う。

---

## 7. `updateRecord`の設計

`src/lib/caffeineRecords.js`に追加する。

```js
export async function updateRecord(id, { drinkName, caffeineMg, consumedAt }) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      drink_name: drinkName,
      caffeine_mg: caffeineMg,
      consumed_at: consumedAt,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return toRecord(data)
}
```

`created_at`は更新payloadに含めない（既存の値のまま変更されない）。`insertRecord`と対称的な構造にする。

---

## 8. `EditRecordPage`の状態管理

`src/pages/EditRecordPage.jsx`を新規実装する。

- `useParams()`で`id`を取得し、`fetchRecordById(id)`を`useEffect`で呼び出す（既存ページと同じ「実装 → 関連テスト」のfetch-on-mountパターン）
- 状態：`record`, `isLoading`, `loadError`, `notFound`（§6参照）
- レンダリング分岐：
  - `isLoading` → 「読み込み中...」
  - `notFound` → Not Found表示
  - `loadError` → 取得エラー表示（再読み込みボタンを設けるかは実装時に既存パターンに揃える）
  - 上記以外 → `<EditRecordForm record={record} />`を表示

---

## 9. `EditRecordForm`の設計

`src/components/EditRecordForm.jsx`を新規実装する。`RecordForm.jsx`と対になる構造だが、以下の点が異なる。

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateRecord } from '../lib/caffeineRecords'
import { toDatetimeLocalValue } from '../lib/dateUtils'
import { validateRecordInput } from '../lib/recordValidation'

const SUBMIT_ERROR_MESSAGE = '記録の更新に失敗しました。もう一度お試しください。'

function EditRecordForm({ record }) {
  const navigate = useNavigate()
  const [drinkName, setDrinkName] = useState(record.drinkName)
  const [caffeineMg, setCaffeineMg] = useState(String(record.caffeineMg))
  const [consumedAt, setConsumedAt] = useState(() => toDatetimeLocalValue(record.consumedAt))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors = validateRecordInput({ drinkName, caffeineMg, consumedAt })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitError('')
    setIsSubmitting(true)

    try {
      await updateRecord(record.id, {
        drinkName: drinkName.trim(),
        caffeineMg: Number(caffeineMg),
        consumedAt: new Date(consumedAt).toISOString(),
      })
      navigate('/history')
    } catch (error) {
      console.error('記録の更新に失敗しました:', error)
      setSubmitError(SUBMIT_ERROR_MESSAGE)
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    navigate('/history')
  }

  // JSX: RecordFormと同じ構造（飲み物・カフェイン量・摂取日時の入力欄、
  // エラー表示、保存/キャンセルボタン）。DrinkPresetPickerは含めない。
}

export default EditRecordForm
```

- 初期値は`record`プロップからセットする（`toDatetimeLocalValue(record.consumedAt)`で摂取日時をローカルタイムゾーンのdatetime-local文字列に変換。§12参照）
- バリデーションは`recordValidation.js`の`validateRecordInput`を共有する（§10）
- 保存成功時は`/history`へ、キャンセル時も`/history`へ遷移する（§13・§14）
- 二重送信防止のロジック（`isSubmitting`）は`RecordForm`と同じパターン

---

## 10. 共通`recordValidation`の設計

`src/lib/recordValidation.js`を新規作成し、`RecordForm.jsx`内にあった`validate`関数のロジックをそのまま移動する（挙動は一切変更しない）。

```js
export function validateRecordInput({ drinkName, caffeineMg, consumedAt }) {
  const errors = {}

  if (drinkName.trim() === '') {
    errors.drinkName = '飲み物を入力してください。'
  }

  if (caffeineMg === '') {
    errors.caffeineMg = 'カフェイン量を入力してください。'
  } else if (Number.isNaN(Number(caffeineMg)) || Number(caffeineMg) < 0) {
    errors.caffeineMg = '0以上の数値を入力してください。'
  }

  const consumedDate = new Date(consumedAt)
  if (consumedAt === '' || Number.isNaN(consumedDate.getTime())) {
    errors.consumedAt = '摂取日時を入力してください。'
  }

  return errors
}
```

`RecordForm.jsx`・`EditRecordForm.jsx`の両方からこの関数をインポートして使用する。

---

## 11. `RecordForm`への最小限の変更

`RecordForm.jsx`の変更は以下のみに限定する。

```diff
- import { insertRecord } from '../lib/caffeineRecords'
+ import { insertRecord } from '../lib/caffeineRecords'
+ import { validateRecordInput } from '../lib/recordValidation'

- function validate({ drinkName, caffeineMg, consumedAt }) {
-   const errors = {}
-   ...（既存のロジック）
-   return errors
- }
-
  function RecordForm() {
    ...
-   const nextErrors = validate({ drinkName, caffeineMg, consumedAt })
+   const nextErrors = validateRecordInput({ drinkName, caffeineMg, consumedAt })
```

- ローカルの`validate`関数定義を削除し、`recordValidation.js`からのインポートに置き換えるのみ
- UI（JSX）、`handleSubmit`の全体的な流れ、`insertRecord`の呼び出し方、`DrinkPresetPicker`の統合（Version 1.5）は一切変更しない
- 既存の`RecordForm.test.jsx`（TEST-002〜006等、Version 1.5のプリセット関連テストを含む）は内容を変更せずそのまま成功する想定

---

## 12. `consumed_at`の初期表示・保存時変換

- **初期表示**：`toDatetimeLocalValue(record.consumedAt)`（`dateUtils.js`、Version 1.0から存在）を使用し、ブラウザのローカルタイムゾーンにおける`"YYYY-MM-DDTHH:mm"`形式の文字列を生成する。UTC文字列の単純な切り出しは行わない
- **保存時変換**：`new Date(consumedAt).toISOString()`（`RecordForm.jsx`と全く同じ変換方法）を使用する。datetime-local文字列はブラウザのローカルタイムゾーンとして解釈されるため、これをUTCのISO文字列に変換してSupabaseへ送る、という既存の新規登録と同じ方針を維持する

---

## 13. 保存成功後の`/history`遷移

`EditRecordForm`の`handleSubmit`が、`updateRecord`成功後に`navigate('/history')`を呼び出す（§9のコード参照）。

---

## 14. キャンセル処理

`EditRecordForm`の`handleCancel`が`navigate('/history')`を呼び出す。入力内容は保存しない（`RecordForm`のキャンセルと同じ考え方）。

---

## 15. 二重送信防止

`RecordForm`と同じ`isSubmitting`パターンを`EditRecordForm`でも使用する。`isSubmitting`が`true`の間は、入力欄・保存ボタン・キャンセルボタンをすべて無効化し、保存ボタンの文言を「保存中...」に変更する。

---

## 16. GRANT UPDATE

`caffeine_records`に対して、anonロールへUPDATE権限を新たに付与する。**テーブル全体へのUPDATE権限ではなく、編集対象の3カラム（`drink_name`, `caffeine_mg`, `consumed_at`）に限定したカラムレベルのGRANTとする。**

```sql
revoke update
on table public.caffeine_records
from anon;

grant update (drink_name, caffeine_mg, consumed_at)
on table public.caffeine_records
to anon;
```

- 先に`revoke update`でテーブル全体のUPDATE権限を（既存の状態を明示的に再確認する意味も込めて）確実に外した上で、`grant update (drink_name, caffeine_mg, consumed_at)`でこの3カラムのみUPDATE可能にする
- `id`・`created_at`はこのGRANTの対象に含まれないため、anonロールはこれらのカラムをUPDATEできない（PostgreSQLのカラムレベル権限により、GRANTしていないカラムを含むUPDATE文はエラーになる）
- これにより、`caffeine_records`に対するanonロールの権限はSELECT・INSERT・DELETE（テーブル全体）に加えて、UPDATEは`drink_name`・`caffeine_mg`・`consumed_at`の3カラムのみ、という構成になる（§21参照）

---

## 17. UPDATE用RLS policy

既存のSELECT/INSERT/DELETEポリシーと同じ形式（`using (true)` / `with check (true)`）で新規作成する。

```sql
drop policy if exists "Allow public update access to caffeine_records"
on public.caffeine_records;

create policy "Allow public update access to caffeine_records"
on public.caffeine_records
for update
to anon
using (true)
with check (true);
```

`drop policy if exists`は既存の`schema.sql`の書き方にならい、再実行時の安全性を確保する。

RLSポリシーは行単位（どの行を対象にできるか）を制御するものであり、カラム単位の制限は行わない。`id`・`created_at`をUPDATEできないようにする制限は、§16のカラムレベルGRANTによって担保する（ポリシーとGRANTの両方が揃って初めて、意図した権限範囲になる）。

---

## 18. migration内容

`supabase/migrations/`配下に新規ファイルを追加する（例：`supabase/migrations/20260914120000_add_caffeine_records_update.sql`。実際のファイル名は実装時のタイムスタンプに合わせる）。

```sql
-- Decaf Log - Version 1.6
-- caffeine_records への UPDATE権限追加（記録編集機能）
--
-- 前提:
-- Version 1.6時点でも認証機能はない。個人利用・デモ用途を前提に、
-- caffeine_records への UPDATE を anon ロールへ許可する。
-- ただしテーブル全体へのUPDATE権限ではなく、編集対象の3カラム
-- （drink_name, caffeine_mg, consumed_at）に限定したカラムレベルの
-- GRANTとする。id・created_atはanonからUPDATEできない状態を維持する。
-- これにより caffeine_records は SELECT/INSERT/DELETE（テーブル全体）
-- に加えて、UPDATEはdrink_name/caffeine_mg/consumed_atの3カラムのみ
-- がanonロールに公開される状態になる。
-- これはMVP/個人デモ用途における既知のセキュリティ制約である
-- （詳細は docs/requirements.md「Version 1.6 セキュリティ上の既知の制約」を参照）。
--
-- 適用方法:
-- Supabaseダッシュボードの SQL Editor でこのファイルの内容を実行する。
-- REVOKE→GRANT、DROP POLICY IF EXISTSを使用しているため、
-- 誤って複数回実行しても安全（冪等）。

revoke update
on table public.caffeine_records
from anon;

grant update (drink_name, caffeine_mg, consumed_at)
on table public.caffeine_records
to anon;

drop policy if exists "Allow public update access to caffeine_records"
on public.caffeine_records;

create policy "Allow public update access to caffeine_records"
on public.caffeine_records
for update
to anon
using (true)
with check (true);
```

---

## 19. `schema.sql`更新内容

`supabase/schema.sql`は「現在のDB全体の完成形」を表すドキュメントとして扱う方針のため、既存の`caffeine_records`（Version 1.0）・`app_settings`（Version 1.1）の記述はそのまま残し、末尾に`app_settings`ブロックに続けて「Version 1.6」のブロック（§18のSQLと同内容）を追記する。

- 既存のVersion 1.0ブロック内にある`revoke update ... from anon;`（テーブル全体のUPDATEを剥奪する記述）は変更しない（これは「その時点の仕様」の記録として残す。Version 1.1〜1.5でも同様に、過去のブロックを書き換えず末尾に追記する方式を一貫して採用してきた）
- Version 1.6ブロックでは、あらためて`revoke update ... from anon;`（テーブル全体）を実行したのち、`grant update (drink_name, caffeine_mg, consumed_at) ... to anon;`でカラムを限定して許可する。これにより、ファイルを上から順に実行した場合の最終状態が「`drink_name`・`caffeine_mg`・`consumed_at`のみUPDATE可能、`id`・`created_at`はUPDATE不可」になる
- 新規プロジェクトでこのファイルを上から実行すれば、Version 1.0〜1.6相当のDB（カラム限定のUPDATE権限を含む）が再現できる状態を維持する

---

## 20. migration適用タイミング

VercelのPreviewとProductionが同じSupabaseプロジェクトを参照するため、migrationの適用タイミングは実装順序（§27）に明記する形で厳密に管理する。要点：

- ローカル実装・テスト・pushの後、**`main`へマージする前に**Supabase本番DBへmigrationを手動適用する
- migration適用前の時点でVercel Preview上から編集の保存を試みると、UPDATE権限がないため権限エラーになることが想定される。これは実装順序上想定される状態であり、不具合ではない
- migration適用時点から、Preview・Productionの両方でanonロールのUPDATE権限（`drink_name`・`caffeine_mg`・`consumed_at`の3カラム限定）が有効になる（同一Supabaseプロジェクトを参照しているため）

---

## 21. セキュリティ上の既知の制約

- Version 1.6では、認証機能なしのままanonロールへ`caffeine_records`のUPDATE権限を公開する。**ただしテーブル全体へのUPDATE権限ではなく、`drink_name`・`caffeine_mg`・`consumed_at`の3カラムに限定したカラムレベルのGRANTとする。** `id`・`created_at`はanonからUPDATEできない状態を維持する
- これにより、`caffeine_records`に対してanonロールが実行できる操作は、SELECT・INSERT・DELETE（テーブル全体）に加えて、UPDATEは編集対象の3カラムのみとなる
- これはMVP・個人利用・デモ用途に限定した暫定的な構成であり、Version 1.0〜1.5から続く既存の制約（`caffeine_records`への公開書き込み・削除許可）の延長線上にある
- 公開URLおよびanon keyを知る誰でも、既存の記録の`drink_name`・`caffeine_mg`・`consumed_at`を書き換えられる状態になる（`id`・`created_at`は書き換えられない）。削除と異なり、書き換え（改ざん）はユーザー本人が気づきにくいという性質がある
- Version 1.6ではSupabase Auth・`user_id`による行単位の制御は導入しない。将来的に一般ユーザー向けに公開する場合は、Supabase Authを導入し、`caffeine_records`に`user_id`を追加した上で「本人の行のみ操作可能」なRLSポリシーへ変更する必要がある
- 編集履歴・監査ログの記録は行わない

---

## 22. 作成するファイル

```
src/pages/EditRecordPage.jsx
src/pages/EditRecordPage.test.jsx
src/components/EditRecordForm.jsx
src/components/EditRecordForm.test.jsx
src/lib/recordValidation.js
src/lib/recordValidation.test.js
supabase/migrations/20260914120000_add_caffeine_records_update.sql
```

---

## 23. 変更するファイル

```
src/App.jsx                     # /records/:id/edit ルートを追加
src/lib/caffeineRecords.js       # fetchRecordById, updateRecord を追加
src/components/RecordItem.jsx     # 「編集」導線を追加
src/components/RecordForm.jsx      # ローカルのvalidateをrecordValidation.jsの利用へ置き換え（§11）
src/pages/HistoryPage.test.jsx      # 「編集」リンクの表示・遷移先のテストを追加
src/App.css                          # 編集導線・編集画面用の最小限のスタイル追加
supabase/schema.sql                   # UPDATE権限・ポリシーを追記（§19）
README.md（実装完了後）
```

`RecordForm.test.jsx`はテスト内容自体は変更しない（§11参照。動作確認のため再実行はする）。`RecordList.jsx`, `HistoryPage.jsx`の一覧表示ロジック本体、`DashboardPage.jsx`, `GoalProgress.jsx`, `goalProgress.js`, `StreakCard.jsx`, `streak.js`, `DailyChart.jsx`, `dailyTotals.js`, `SettingsForm.jsx`, `SettingsPage.jsx`, `appSettings.js`, `BottomNavigation.jsx`, `DrinkPresetPicker.jsx`, `drinkPresets.js`, `dateUtils.js`, `supabaseClient.js`, `package.json`はいずれも変更しない。

---

## 24. Version 1.6テストケース

### `recordValidation.js`（ロジック単体テスト）

| テストID | 内容 |
| --- | --- |
| TEST-601 | 飲み物が空欄（空白のみ含む）の場合エラーになる |
| TEST-602 | カフェイン量が未入力の場合エラーになる |
| TEST-603 | カフェイン量が負数の場合エラーになる |
| TEST-604 | カフェイン量が数値として扱えない場合エラーになる |
| TEST-605 | 摂取日時が未入力・不正な日時の場合エラーになる |
| TEST-606 | すべて正しい入力の場合エラーが発生しない |

### `caffeineRecords.js`追加分（ロジック単体テスト）

| テストID | 内容 |
| --- | --- |
| TEST-607 | `fetchRecordById`が該当レコードをcamelCase変換して返す |
| TEST-608 | `fetchRecordById`が該当レコードなしの場合`null`を返す（`maybeSingle`利用） |
| TEST-609 | `fetchRecordById`が通信・取得エラー時はエラーをthrowする |
| TEST-610 | `updateRecord`が正しいpayload（`drink_name`, `caffeine_mg`, `consumed_at`）で`update`を呼び出す |
| TEST-611 | `updateRecord`がエラー時はエラーをthrowする |

### `EditRecordForm.jsx`（表示・統合テスト）

| テストID | 内容 |
| --- | --- |
| TEST-612 | 対象記録の飲み物・カフェイン量・摂取日時（ローカルタイムゾーン）が初期値として正しく表示される |
| TEST-613 | 値を変更して保存すると、`updateRecord`が正しい引数で呼ばれる |
| TEST-614 | 保存成功後、`/history`へ遷移する |
| TEST-615 | バリデーションエラー時（飲み物未入力等）は保存されず、エラーメッセージが表示される |
| TEST-616 | キャンセルすると`/history`へ遷移し、`updateRecord`は呼ばれない |
| TEST-617 | 保存中は入力欄・ボタンが無効化される（二重送信防止） |
| TEST-618 | 保存失敗時はエラーメッセージが表示され、入力内容が保持される |

### `EditRecordPage.jsx`（表示・統合テスト）

| テストID | 内容 |
| --- | --- |
| TEST-619 | 取得中はLoading状態（「読み込み中...」）が表示される |
| TEST-620 | 取得成功時、`EditRecordForm`が表示される |
| TEST-621 | 取得失敗（通信エラー）時、通常のError状態が表示される |
| TEST-622 | 該当レコードが存在しない場合、Not Found状態（「指定された記録が見つかりませんでした。」）が表示され、通常のErrorとは異なるメッセージになる |
| TEST-623 | Not Found状態で「履歴に戻る」リンクが`/history`を指す |

### `HistoryPage.test.jsx`追加分

| テストID | 内容 |
| --- | --- |
| TEST-624 | 各記録に「編集」リンクが表示され、`/records/:id/edit`を指す |

---

## 25. Version 1.0〜1.5の回帰テスト

- 既存の125件のテスト（Version 1.0〜1.5）をすべて再実行し、全件成功することを確認する
- `RecordForm.test.jsx`は、ローカル`validate`を`recordValidation.js`の利用へ置き換えた後も、既存のテスト内容（TEST-002〜006、Version 1.5のプリセット関連テスト含む）を一切変更せずにそのまま成功させることを回帰確認の基準とする
- `RecordList.jsx`, `HistoryPage.jsx`の一覧表示・削除・Loading/Error/Empty状態、`DashboardPage.jsx`, `GoalProgress.jsx`, `StreakCard.jsx`, `DailyChart.jsx`, `SettingsForm.jsx`, `SettingsPage.jsx`はいずれも無変更のため、対応するテストの内容も変更しない

---

## 26. test / lint / build

- 各実装ステップ後に`npm run test`と`npm run lint`を実行し、失敗があればその場で修正する
- 実装完了後、最終確認として以下をすべて実行し、成功を確認する

```bash
npm run test
npm run lint
npm run build
```

---

## 27. 実装順序（migration適用順序を含む）

ユーザーに確定いただいた順序をそのまま採用する。

1. `src/lib/recordValidation.js`を実装し、`RecordForm.jsx`を最小限の変更で移行する（§10・§11）
   → 関連テスト（TEST-601〜606）→ `lint`/`test`確認 → `RecordForm.test.jsx`の既存テストが無変更で成功することを確認
2. `src/lib/caffeineRecords.js`に`fetchRecordById`・`updateRecord`を追加する（§5・§7）
   → 関連テスト（TEST-607〜611）→ `lint`/`test`確認
3. `src/components/EditRecordForm.jsx`を実装する（§9）
   → 関連テスト（TEST-612〜618）→ `lint`/`test`確認
4. `src/pages/EditRecordPage.jsx`を実装する（§6・§8）
   → 関連テスト（TEST-619〜623）→ `lint`/`test`確認
5. `src/App.jsx`に`/records/:id/edit`ルートを追加する（§3）
6. `src/components/RecordItem.jsx`に「編集」導線を追加する（§4）
   → `HistoryPage.test.jsx`を更新（TEST-624）→ `lint`/`test`確認
7. `supabase/migrations/`にVersion 1.6用migrationを作成し、`supabase/schema.sql`にも反映する（§18・§19。**この時点ではまだ本番DBへは適用しない**）
8. Version 1.0〜1.5の既存テスト（125件）をすべて再実行し、回帰がないことを確認する（§25）
9. `npm run test` / `npm run lint` / `npm run build` を実行し、すべて成功することを確認する（§26）
10. Version 1.6の変更をcommitする
11. `feature/v1.6-record-edit` をGitHubへpushする（§28）
12. Vercel Preview DeploymentがReadyになるまで確認する（§29）
13. **この時点ではまだ`main`へマージしない**
14. Supabase SQL EditorでVersion 1.6用migrationを手動適用する（§18・§20）
15. migration適用結果を確認する（`caffeine_records`にUPDATE権限・ポリシーが正しく反映されているか）
16. Vercel Preview上で編集機能の実動作を確認する（migration適用前の権限エラーは想定内。適用後にあらためて確認する）
17. Version 1.0〜1.5の既存機能をPreview上で再確認する
18. 問題がなければ、必要に応じてPRを作成した上で`main`へマージする
19. `main`へのマージにより、VercelがProduction Deploymentを自動実行する
20. Production環境で最終スモークテストを実施する（§31）

**重要：** migration適用前の時点でVercel Preview上から編集の保存を試みると、UPDATE権限がないため権限エラーになることが想定される。これは仕様上想定される状態であり、不具合として扱わない。

---

## 28. GitHub feature branchへのpush

- ブランチ：`feature/v1.6-record-edit`
- `main`を直接変更せず、feature branch上で実装・コミットする
- test/lint/build成功後、featureブランチをGitHubへpushする
- Version 1.2〜1.5のときと異なり、**push後すぐにmainへマージする流れにはしない**。Supabase本番DBへのmigration適用（§20）と、その後のPreview上での実動作確認を挟んでからマージする

---

## 29. Vercel Preview確認

Preview確認は2段階に分かれる。

### 29.1 push直後・migration適用前

- Preview Deploymentが生成され、ビルドが成功していることを確認する
- `/history`に「編集」リンクが表示され、`/records/:id/edit`へ遷移できることを確認する
- 編集画面で値を変更して保存を試みた場合、UPDATE権限がまだないため**保存が失敗することを確認する（想定内の動作）**

### 29.2 migration適用後（正式な動作確認）

Supabase本番DBへのmigration適用（§20）が完了したのち、同じPreview URL上で以下をあらためて確認し、これをもって「Version 1.6のPreviewでの動作確認完了」とする。

**PreviewとProductionが同じSupabaseプロジェクトを参照するため、既存の重要な記録を直接編集せず、以下の手順を基本とする。**

1. テスト専用の記録を新規登録する（例：飲み物名に「テスト」等、識別しやすい値を使う）
2. そのテスト記録を編集する（飲み物・カフェイン量・摂取日時を変更）
3. `/history`に変更内容が反映されていることを確認する
4. `/`（今日の合計・目標進捗・連続達成日数）に変更内容が反映されていることを確認する
5. `/history`の日別グラフに変更内容が反映されていることを確認する
6. 必要であれば、摂取日時を別の日に変更し、日付が移動した場合の日別グラフ・連続達成日数への反映も確認する
7. 確認が終わったら、そのテスト記録を削除する

これに加えて、以下も確認する。

- `/history`の既存の「編集」リンクから`/records/:id/edit`へ正しく遷移できる（テスト記録に対してのみ操作する）
- 存在しない記録IDへのアクセスでNot Found状態が表示される
- 既存の削除機能・記録登録・設定機能に影響がないこと

Preview DeploymentはProductionと同じSupabaseプロジェクトを参照するため、Preview上で追加・編集・削除した内容もすべて本番Supabaseに反映される（Version 1.1以降で合意済みの制約と同様）。

---

## 30. Version 1.6受け入れ条件

`docs/requirements.md`・`docs/screen-design.md`に記載済みの内容を転記する。

- [ ] `/history`の各記録から「編集」導線で`/records/:id/edit`へ遷移できる
- [ ] 編集画面に、対象記録の飲み物名・カフェイン量・摂取日時が正しい初期値で表示される
- [ ] 摂取日時は、ブラウザのローカルタイムゾーンで正しく初期表示される
- [ ] 飲み物名・カフェイン量・摂取日時を編集し、保存できる
- [ ] 保存成功後、`/history`へ遷移する
- [ ] キャンセルすると、変更を保存せず`/history`へ戻る
- [ ] 保存処理中は二重送信が防止される
- [ ] 新規登録と同じ入力バリデーションが編集画面でも機能する
- [ ] 存在しない記録IDへアクセスした場合、通常のエラーとは区別された「指定された記録が見つかりませんでした。」と「履歴に戻る」導線が表示される
- [ ] 編集後、履歴・今日の合計・目標進捗・日別グラフ・連続達成日数に編集内容が反映される
- [ ] 既存の記録削除機能に影響がない
- [ ] 既存のVersion 1.0〜1.5機能に影響がない
- [ ] `caffeine_records`の`drink_name`・`caffeine_mg`・`consumed_at`に対するUPDATE権限（カラムレベルGRANT・RLSポリシー）が、Supabase本番DBへ適用済みである
- [ ] `caffeine_records`の`id`・`created_at`はanonロールからUPDATEできない状態が維持されている
- [ ] `app_settings`のDB構造・RLS・GRANTに変更がない
- [ ] テストが成功する
- [ ] lintが成功する
- [ ] production buildが成功する

---

## 31. mainへmergeする前の最終確認・Productionスモークテスト

### mainへmergeする前の最終確認項目

1. [ ] `npm run test` / `npm run lint` / `npm run build` がすべて成功している
2. [ ] `app_settings`のDB定義・RLS・GRANTに差分がないことを確認済み（`caffeine_records`以外は無変更）
3. [ ] `DashboardPage.jsx`, `GoalProgress.jsx`, `StreakCard.jsx`, `DailyChart.jsx`, `SettingsForm.jsx`, `DrinkPresetPicker.jsx`に差分がないことを確認済み
4. [ ] Version 1.7相当のコードが混入していないことを確認済み
5. [ ] `package.json` / `package-lock.json`に差分がないことを確認済み
6. [ ] `feature/v1.6-record-edit`をGitHubへpush済みで、Vercel Preview Deploymentが生成されていることを確認済み
7. [ ] Supabase本番DBへ`caffeine_records`のUPDATE権限（GRANT・RLSポリシー）が適用済みであることを確認済み
8. [ ] migration適用後、Vercel Preview上で編集機能の動作確認が正式に完了している（§29.2）
9. [ ] §30のVersion 1.6受け入れ条件をすべて満たしている
10. [ ] Version 1.0〜1.5の既存125件のテストを含め、回帰確認が成功している
11. [ ] README等ドキュメントの更新要否を確認済み

### Production環境での最終スモークテスト

`main`マージ・Production Deployment完了後、本番URL上で以下を確認する。**編集・削除の動作確認は、§29.2と同様にテスト専用の記録を新規登録して行い、確認後に削除する（既存の重要な記録を直接編集しない）。**

- `/history`の各記録から「編集」で`/records/:id/edit`へ遷移できる（テスト記録に対して操作する）
- テスト記録の飲み物名・カフェイン量・摂取日時を編集し、保存できる
- 保存後、`/history`に変更内容が反映される
- `/`（今日の合計・目標進捗・連続達成日数）・`/history`の日別グラフにも変更内容が反映される
- キャンセルすると変更が保存されない
- 存在しない記録IDへのアクセスでNot Found状態が表示される
- 既存の記録登録・削除・設定機能に影響がないこと
- 各ページの直接URLアクセス・ブラウザ更新に問題がないこと（`/records/:id/edit`を含む）
- 重大なconsole errorがないこと
- 確認に使用したテスト記録を削除済みであること
