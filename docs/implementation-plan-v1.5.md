# Decaf Log Version 1.5 実装計画

「飲み物プリセット」の実装計画。`docs/requirements.md`（Version 1.5詳細仕様・受け入れ条件）と `docs/screen-design.md`（§79〜§85）で確定した仕様に基づく。

**この時点ではまだソースコードへの変更は行っていない。** 本書は実装前の計画のみを示す。

- 作成日: 2026-09-13
- 対象: Version 1.5「飲み物プリセット」のみ（Version 1.6以降は対象外）
- ブランチ：`feature/v1.5-drink-presets`

---

## 0. 重要な制約（確認済み）

- プリセットはコーヒー・緑茶・紅茶・烏龍茶・エナジードリンク・コーラの6種類のみ（追加・編集機能、ユーザー独自プリセットは実装しない）
- プリセット値は整数mgのみ（コーヒー90 / 緑茶30 / 紅茶30 / 烏龍茶20 / エナジードリンク100 / コーラ35）。目安値として扱い、注意書きを表示する
- プリセット選択は`drinkName`・`caffeineMg`へ値をセットするだけの入力ショートカット。「選択中」state・ハイライト・選択解除処理は実装しない
- 「その他／手入力」専用ボタンは追加しない。プリセットを選ばなければ従来通り手入力できる
- `/record`にchip形式で表示。スマートフォン幅で自然に折り返し、横スクロールを前提にしない
- 既存の`validate`・`handleSubmit`・`insertRecord`の動作は必要以上に変更しない
- プリセットはフロントエンドの定数として管理し、DBには保存しない。DB構造・migration・RLS・GRANTは変更しない
- Version 1.6以降の機能、記録編集、カスタムプリセット、認証機能は実装しない

---

## 1. Version 1.5で実装する機能

- `/record`にプリセットボタン（6種類、chip形式）を追加（FR-011）
- プリセットボタン押下で、「飲み物」（`drinkName`）と「カフェイン量」（`caffeineMg`）へ対応する値をセットする
- プリセット選択後も、「飲み物」「カフェイン量」を自由に編集できる
- 「※カフェイン量は目安です。選択後に変更できます。」という注意書きを表示する
- プリセットを使わず、従来通り手入力のみで記録を登録できる

---

## 2. 実装しない機能

- Version 1.6以降の機能
- 記録編集機能
- ユーザーが自由にプリセットを追加・編集できる機能（カスタムプリセット）
- 新しい認証機能
- 「現在選択中のプリセット」を表すstate、選択中ハイライト、値変更時の選択解除・同期処理
- 専用の「その他／手入力」ボタン
- `caffeine_records` / `app_settings` のDB構造変更、Supabase migration、RLS / GRANTの変更
- 新しいライブラリの追加
- `RecordPage.jsx`, `caffeineRecords.js`, `RecordList.jsx`, `RecordItem.jsx`, `HistoryPage.jsx`, `DailyChart.jsx`, `dailyTotals.js`, `SettingsForm.jsx`, `SettingsPage.jsx`, `appSettings.js`, `DashboardPage.jsx`, `GoalProgress.jsx`, `goalProgress.js`, `StreakCard.jsx`, `streak.js`, `BottomNavigation.jsx`, `App.jsx`, `dateUtils.js`, `supabaseClient.js` への変更

---

## 3. `drinkPresets`のデータ構造

`src/lib/drinkPresets.js`に、プリセットの一覧を定数配列としてエクスポートする。

```js
export const DRINK_PRESETS = [
  { name: 'コーヒー', caffeineMg: 90 },
  { name: '緑茶', caffeineMg: 30 },
  { name: '紅茶', caffeineMg: 30 },
  { name: '烏龍茶', caffeineMg: 20 },
  { name: 'エナジードリンク', caffeineMg: 100 },
  { name: 'コーラ', caffeineMg: 35 },
]
```

- 6件固定、`caffeineMg`はすべて整数
- DBには保存しない。この配列がプリセットの唯一の管理場所となる

---

## 4. `DrinkPresetPicker`の設計

`src/components/DrinkPresetPicker.jsx`を新規実装する。

```jsx
import { DRINK_PRESETS } from '../lib/drinkPresets'

function DrinkPresetPicker({ onSelect, disabled }) {
  return (
    <div className="drink-preset-picker">
      <div className="drink-preset-list">
        {DRINK_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            className="drink-preset-chip"
            onClick={() => onSelect(preset)}
            disabled={disabled}
          >
            {preset.name}（{preset.caffeineMg}mg）
          </button>
        ))}
      </div>
      <p className="drink-preset-note">※カフェイン量は目安です。選択後に変更できます。</p>
    </div>
  )
}

export default DrinkPresetPicker
```

- `onSelect(preset)`：プリセットボタンが押されたときに呼び出されるコールバック。選択されたプリセットオブジェクト（`{ name, caffeineMg }`）を渡す
- `disabled`：登録処理中（`isSubmitting`）はボタンを無効化するために使用する（既存の入力欄と同様の扱い）
- コンポーネント自身は「選択中」の状態を一切保持しない（押されたら`onSelect`を呼ぶだけの見た目上のボタン集合）

---

## 5. `RecordForm`との統合方法

`RecordForm.jsx`に`DrinkPresetPicker`をインポートし、「飲み物」入力欄の直下に配置する。

```jsx
import DrinkPresetPicker from './DrinkPresetPicker'
// ...

function handlePresetSelect(preset) {
  setDrinkName(preset.name)
  setCaffeineMg(String(preset.caffeineMg))
}

// JSX内、drinkNameのform-fieldの直後:
<DrinkPresetPicker onSelect={handlePresetSelect} disabled={isSubmitting} />
```

`validate`関数・`handleSubmit`・`insertRecord`呼び出しは一切変更しない。プリセットで入力された値も、手入力された値と全く同じ`drinkName`・`caffeineMg`のstateとして扱われるため、既存のバリデーション・送信ロジックがそのまま機能する。

---

## 6. プリセット選択時のstate更新

`handlePresetSelect`が、既存の`drinkName`・`caffeineMg`のstate（`useState`）をそのまま更新する。

- `setDrinkName(preset.name)`：文字列をそのままセット
- `setCaffeineMg(String(preset.caffeineMg))`：`caffeineMg`は文字列としてstate管理されている（数値入力欄の`value`として使うため）ので、数値を文字列に変換してセットする

新しいstate（選択中プリセットIDなど）は追加しない。

---

## 7. 選択後の手動編集

プリセット選択後も、「飲み物」「カフェイン量」の`<input>`要素とその`onChange`ハンドラは通常通り機能する。プリセットボタンのクリックは、単に既存のstateへ値を書き込むだけの操作であり、以降の入力欄の編集を妨げる仕組み（`readOnly`化やロックなど）は一切追加しない。

---

## 8. 手入力のみの既存フロー

プリセットボタンを一度も押さない場合、`RecordForm`の挙動はVersion 1.4までと完全に同一である。`DrinkPresetPicker`はUIに要素を追加するだけで、押されない限り`drinkName`・`caffeineMg`のstateには一切影響しない。

既存のテスト（TEST-002〜006、登録成功/失敗のテスト）は変更せずにそのまま成功する想定。

---

## 9. 注意書きの表示

`DrinkPresetPicker`内に、プリセットボタン群の下へ以下の文言を表示する（§4のコード参照）。

```text
※カフェイン量は目安です。選択後に変更できます。
```

小さく目立ちすぎない表示とする（`App.css`で小さめのフォントサイズ・控えめな色を指定）。エラーメッセージ（`.form-error`）とは異なる、注意書き用のクラス（例：`.drink-preset-note`）を新設する。

---

## 10. モバイル表示

`.drink-preset-list`を`display: flex; flex-wrap: wrap;`とし、ボタンの幅は内容に応じた可変幅にする。固定幅・固定列数は指定せず、画面幅に応じて自然に折り返すようにする。横スクロール（`overflow-x: scroll`等）は使用しない。

大きなデザイン変更は行わず、既存の`.button`系クラスのスタイル（角丸・余白等）と統一感のあるシンプルな見た目にする。

---

## 11. 作成するファイル

```
src/lib/drinkPresets.js                 # DRINK_PRESETS定数
src/lib/drinkPresets.test.js            # 定数の内容（件数・整数値）を検証
src/components/DrinkPresetPicker.jsx    # プリセットボタン群
src/components/DrinkPresetPicker.test.jsx
```

---

## 12. 変更するファイル

```
src/components/RecordForm.jsx       # DrinkPresetPickerの統合、handlePresetSelectの追加
src/components/RecordForm.test.jsx   # プリセット選択・手動編集・手入力併存のテストを追加
src/App.css                           # .drink-preset-picker 等のスタイル追加
```

`RecordPage.jsx`, `caffeineRecords.js`, `RecordList.jsx`, `RecordItem.jsx`, `HistoryPage.jsx`, `DailyChart.jsx`, `dailyTotals.js`, `SettingsForm.jsx`, `SettingsPage.jsx`, `appSettings.js`, `DashboardPage.jsx`, `GoalProgress.jsx`, `goalProgress.js`, `StreakCard.jsx`, `streak.js`, `BottomNavigation.jsx`, `App.jsx`, `dateUtils.js`, `supabaseClient.js`, `supabase/schema.sql`, `supabase/migrations/`, `package.json`はいずれも変更しない。

---

## 13. テストケース

### `drinkPresets.js`（データ検証）

| テストID | 内容 |
| --- | --- |
| TEST-501 | `DRINK_PRESETS`が6件で、名前がコーヒー・緑茶・紅茶・烏龍茶・エナジードリンク・コーラであり、`caffeineMg`がすべて整数であることを確認する |

### `DrinkPresetPicker.jsx`（表示テスト）

| テストID | 内容 |
| --- | --- |
| TEST-502 | 6件のプリセットボタンが表示される |
| TEST-503 | 「※カフェイン量は目安です。選択後に変更できます。」が表示される |
| TEST-504 | プリセットボタンを押すと、`onSelect`が正しいプリセット（`{ name, caffeineMg }`）を引数に呼ばれる |
| TEST-505 | `disabled`が`true`のとき、すべてのプリセットボタンが無効化される |

### `RecordForm.jsx`（統合テスト）

| テストID | 内容 |
| --- | --- |
| TEST-506 | プリセットボタンをクリックすると、「飲み物」「カフェイン量」欄に対応する値がセットされる |
| TEST-507 | プリセット選択後、「飲み物」「カフェイン量」を手動で編集できる（上書き可能） |
| TEST-508 | 複数のプリセットボタンを連続でクリックした場合、最後に選んだ値が反映される |
| TEST-509 | プリセットを選択せず、従来通り手入力のみで登録できる（既存TEST-002・TEST-003相当の回帰確認） |
| TEST-510 | プリセット選択後に送信すると、正しい`drinkName`・`caffeineMg`が`insertRecord`へ渡る |
| TEST-511 | 登録処理中（送信中）は、既存の入力欄と同様にプリセットボタンも無効化される |

---

## 14. Version 1.0〜1.4の回帰テスト

- 既存の112件のテスト（Version 1.0〜1.4）をすべて再実行し、全件成功することを確認する
- `RecordForm.test.jsx`の既存テスト（TEST-002〜006、登録成功・失敗のテスト）は、`validate`・`handleSubmit`・`insertRecord`を変更しないため、内容を変更せずそのまま成功する想定
- `RecordPage.jsx`, `caffeineRecords.js`, `HistoryPage.jsx`, `DailyChart.jsx`, `dailyTotals.js`, `SettingsForm.jsx`, `SettingsPage.jsx`, `appSettings.js`, `DashboardPage.jsx`, `GoalProgress.jsx`, `goalProgress.js`, `StreakCard.jsx`, `streak.js`はいずれも無変更のため、対応するテストの内容も変更しない

---

## 15. DB変更が不要であることの確認

Version 1.5は表示・入力補助の追加のみで完結し、DBスキーマの変更は不要である。

- プリセットの定義（飲み物名・カフェイン量の目安値）はソースコード内の定数として管理し、DBには保存しない
- 新しいテーブル・カラムの追加は行わない
- `supabase/schema.sql`・`supabase/migrations/`への追記は行わない
- Supabase本番DBへは一切アクセス・変更しない

---

## 16. RLS / GRANTが不要であることの確認

- プリセット選択は`drinkName`・`caffeineMg`のstateを更新するだけのフロントエンド内の操作であり、新しいSupabase操作は発生しない
- 記録の保存は既存の`insertRecord`（`caffeine_records`への`INSERT`）をそのまま利用する
- 既存のRLSポリシー・GRANT文（`supabase/schema.sql`）には一切変更を加えない

---

## 17. `package.json`変更が不要であることの確認

Version 1.5は既存の`react`のみで実装が完結し、新しいライブラリの追加は不要である。`package.json` / `package-lock.json`に変更は加えない。

---

## 18. test / lint / build確認

- 各実装ステップ後（§19参照）に`npm run test`と`npm run lint`を実行し、失敗があればその場で修正する
- 実装完了後、最終確認として以下をすべて実行し、成功を確認する

```bash
npm run test
npm run lint
npm run build
```

---

## 19. GitHub feature branchへのpush

- ブランチ：`feature/v1.5-drink-presets`
- `main`を直接変更せず、feature branch上で実装・コミットする
- test/lint/build成功後、featureブランチをGitHubへpushする
- Version 1.2〜1.4のときと同様、PRを先に作成する必要はない。push後のPreview確認・受け入れ条件確認・回帰確認が完了したのち、必要に応じてPRを作成して`main`へマージする

### 実装順序（参考）

1. `src/lib/drinkPresets.js` を実装 → 関連テスト（TEST-501）→ `lint`/`test`確認
2. `src/components/DrinkPresetPicker.jsx` を実装 → 関連テスト（TEST-502〜505）→ `lint`/`test`確認
3. `RecordForm.jsx`に統合 → `RecordForm.test.jsx`を更新（TEST-506〜511）→ `lint`/`test`確認
4. Version 1.0〜1.4の既存テスト（112件）を再実行し、回帰がないことを確認（§14）
5. `npm run test` / `npm run lint` / `npm run build` を実行し、すべて成功することを確認する
6. commit → `feature/v1.5-drink-presets` をpush → Vercel Preview確認 → 受け入れ条件確認 → 回帰確認 → 必要に応じてPR作成 → `main`へマージ → Production Deployment → 本番スモークテスト

---

## 20. Vercel Preview確認

- GitHubへpushすると、Vercelが自動的にPreview Deploymentを作成する
- Version 1.5はDBスキーマ変更が不要なため、push直後のPreviewでそのまま動作確認を行える
- Preview URL上で以下を確認する
  - `/record`にプリセットボタン（6種類）が表示される
  - プリセットボタンを押すと「飲み物」「カフェイン量」に値がセットされる
  - プリセット選択後に値を編集して登録できる
  - プリセットを使わず手入力のみで登録できる
  - スマートフォン幅でプリセットボタンが自然に折り返される
  - 既存の`/`, `/history`, `/settings`に影響がないこと

---

## 21. Version 1.5受け入れ条件

`docs/requirements.md`・`docs/screen-design.md`に記載済みの内容を転記する。

- [ ] `/record`にプリセットボタン（6種類：コーヒー・緑茶・紅茶・烏龍茶・エナジードリンク・コーラ）が表示される
- [ ] プリセットボタンを押すと、「飲み物」「カフェイン量」へ対応する値がセットされる
- [ ] プリセット選択後も、「飲み物」「カフェイン量」を自由に編集できる
- [ ] プリセットを選択せず、従来通り手入力のみで記録を登録できる
- [ ] 「※カフェイン量は目安です。選択後に変更できます。」という注意書きが表示される
- [ ] プリセットの値はすべて整数mgである
- [ ] スマートフォン幅でプリセットボタンが自然に折り返され、横スクロールが発生しない
- [ ] 既存の入力バリデーション（飲み物未入力、カフェイン量未入力、負数、数値として扱えない値）に変更がない
- [ ] `caffeine_records`・`app_settings`のDB構造・RLS・GRANTに変更がない
- [ ] 既存のVersion 1.0〜1.4機能（記録・履歴・削除・今日の合計・設定・目標進捗・日別グラフ・連続達成日数）に影響がない
- [ ] テストが成功する
- [ ] lintが成功する
- [ ] production buildが成功する

---

## 22. mainへmergeする前の最終確認項目

1. [ ] `npm run test` / `npm run lint` / `npm run build` がすべて成功している
2. [ ] `caffeine_records` / `app_settings` のDB定義・RLS・GRANTに差分がないことを確認済み
3. [ ] `RecordPage.jsx`, `caffeineRecords.js`, `HistoryPage.jsx`, `DailyChart.jsx`, `dailyTotals.js`, `SettingsForm.jsx`, `SettingsPage.jsx`, `DashboardPage.jsx`, `GoalProgress.jsx`, `StreakCard.jsx`, `streak.js` に差分がないことを確認済み
4. [ ] Version 1.6相当・記録編集・カスタムプリセット・認証機能のコードが混入していないことを確認済み
5. [ ] `package.json` / `package-lock.json`に差分がないことを確認済み
6. [ ] `feature/v1.5-drink-presets` をGitHubへpush済みで、Vercel Preview Deploymentが生成されていることを確認済み
7. [ ] Vercel Preview上でVersion 1.5の動作（プリセット選択・手動編集・手入力のみのフロー）を確認済み
8. [ ] §21のVersion 1.5受け入れ条件をすべて満たしている
9. [ ] Version 1.0〜1.4の既存112件のテストを含め、回帰確認が成功している
10. [ ] README等ドキュメントの更新要否を確認済み

上記すべてを満たしたら、必要に応じてPRを作成し、ユーザーの承認を得てから`main`へマージする。マージにより、Vercelが自動的にProduction Deploymentを実行する。

---

## 23. Production環境での最終スモークテスト

`main`マージ・Production Deployment完了後、本番URL上で以下を確認する。

- `/record`にプリセットボタンが表示される
- プリセットボタンを押すと「飲み物」「カフェイン量」に値がセットされる
- プリセット選択後に値を編集し、正しい内容で登録できる
- プリセットを使わず、手入力のみで登録できる
- 「※カフェイン量は目安です。選択後に変更できます。」が表示される
- スマートフォン幅でプリセットボタンが自然に折り返される（横スクロールが発生しない）
- 既存の`/`, `/history`, `/settings`の動作に影響がないこと（今日の合計・目標進捗・連続達成日数・日別グラフ・記録削除・目標設定）
- 各ページの直接URLアクセス・ブラウザ更新が引き続き問題ないこと
- 重大なconsole errorがないこと

---

## 24. 既知の制約

- プリセットのカフェイン量は目安値であり、実際の飲料の銘柄・抽出方法・容量によって実際のカフェイン量とは異なる場合がある。ユーザーが選択後に正確な値へ修正することを前提とした設計である
- プリセットの種類・値はソースコードに固定されており、Version 1.5の時点ではアプリのUIから追加・編集・削除することはできない
- ユーザーごとに異なるプリセット（カスタムプリセット）は実装していない。将来的に対応する場合は、新しいDBテーブル・RLS・GRANTの設計が別途必要になる
- Version 1.0〜1.4から引き続く制約（認証なし、`caffeine_records`のRLSがMVP/デモ用途の暫定構成、記録編集不可、目標値履歴なし、Rechartsによるバンドルサイズ増加など）は変更なし
