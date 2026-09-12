// 飲み物プリセット（Version 1.5）。
//
// カフェイン量は正確な固定値ではなく、入力を補助するための目安値。
// 銘柄・抽出方法・容量によって実際のカフェイン量は異なる。
// プリセットはフロントエンドの定数として管理し、DBには保存しない。

export const DRINK_PRESETS = [
  { name: 'コーヒー', caffeineMg: 90 },
  { name: '緑茶', caffeineMg: 30 },
  { name: '紅茶', caffeineMg: 30 },
  { name: '烏龍茶', caffeineMg: 20 },
  { name: 'エナジードリンク', caffeineMg: 100 },
  { name: 'コーラ', caffeineMg: 35 },
]
