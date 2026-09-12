// 日別カフェイン摂取量グラフ（Version 1.3）用の集計ロジック。
//
// 重要: 日付はすべてブラウザのローカルタイムゾーンを基準に判定する。
// UTC日付文字列の切り出しでは判定しない（dateUtils.js の方針を踏襲する）。

import { getLocalDateKey } from './dateUtils'

/**
 * 基準日を含む直近n日分のDateを、古い→新しい（基準日が最後）の順で返す。
 *
 * Dateの setDate/getDate はローカルタイムゾーンで動作するため、
 * 月またぎ・年またぎも正しく扱える。
 */
export function getLastNDates(n, referenceDate = new Date()) {
  const dates = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const date = new Date(referenceDate)
    date.setDate(date.getDate() - i)
    dates.push(date)
  }
  return dates
}

/**
 * 記録一覧を、基準日を含む直近n日分（デフォルト7日）の日別合計に集計する。
 *
 * - 同じ日の複数記録は合算する
 * - 対象期間に記録がない日は 0 として補完する（対象期間より前・後の記録は含めない）
 * - 戻り値は常にn件（日付が欠けることはない）
 */
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

/**
 * Rechartsの Tooltip 用フォーマッタ（純粋関数）。
 *
 * 集計時の浮動小数点演算の誤差（例: 0.1 + 0.2 = 0.30000000000000004）が
 * そのまま画面に表示されないよう、小数第1位に丸める。
 */
export function formatCaffeineTooltip(value) {
  const rounded = Math.round(value * 10) / 10
  return [`${rounded}mg`, 'カフェイン摂取量']
}
