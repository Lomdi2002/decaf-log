// カフェイン記録（新規登録・編集）で共通に使う入力バリデーション。
//
// RecordForm（新規登録）とEditRecordForm（編集、Version 1.6）の両方から
// 同じルールを利用する。挙動はVersion 1.0のRecordFormが元々持っていた
// validate関数から一切変更していない。

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
