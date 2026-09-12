// 連続達成日数（Version 1.4）の計算ロジック。
//
// 重要:
// - 「達成」= その日の合計摂取量が目標値以下（dailyTotalMg <= goalMg）。
//   目標値ちょうどの場合も達成として扱う。
// - 今日は判定対象に含めない。判定は「昨日まで」を基準とする。
// - 記録がない日は0mgとして扱う。
// - caffeine_recordsに存在する最初の記録日より前には遡らない。
// - 日付はすべてブラウザのローカルタイムゾーンを基準に判定する
//   （dateUtils.js の getLocalDateKey を使用し、UTC日付文字列の切り出しは行わない）。

import { getLocalDateKey } from './dateUtils'

// 遡り判定の反復回数の上限（約270年分）。
// 30日・365日等の業務上の固定上限ではなく、万一のロジック不具合による
// 無限ループを防ぐための技術的な安全装置。通常利用では到達しない。
const MAX_ITERATIONS = 100000

function isAchieved(totalMg, goalMg) {
  return totalMg <= goalMg
}

/**
 * @param {Array} records fetchRecords() が返す記録一覧
 * @param {number|null} goalMg 1日のカフェイン目標値(mg)。未設定はnull
 * @param {Date} referenceDate 基準日（デフォルトは現在時刻）。この前日から遡る
 * @returns {{status: 'unset'} | {status: 'counted', days: number}}
 */
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
  cursor.setDate(cursor.getDate() - 1) // 昨日から開始（今日は判定対象外）

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
