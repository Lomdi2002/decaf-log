// 1日のカフェイン目標に対する進捗を計算する純粋関数。
//
// Decaf Logはカフェイン摂取量の「削減」を支援するアプリである。そのため、
// ここでの「進捗」は一般的な達成率（満ちるほど良い）とは異なり、
// 「1日のカフェイン目標上限にどれだけ近づいているか」を表す。

/**
 * @param {number} todayTotalMg 今日のカフェイン摂取量合計(mg)
 * @param {number|null} goalMg 1日のカフェイン目標値(mg)。未設定はnull
 * @returns {object} statusと、状態に応じた付随情報を持つオブジェクト
 *
 * status:
 * - 'unset'          : 目標未設定
 * - 'within-zero'    : 目標0mgで、今日の摂取量も0mg
 * - 'exceeded-zero'  : 目標0mgで、今日の摂取量が1mg以上
 * - 'normal'         : 目標未到達（todayTotalMg < goalMg）
 * - 'reached'        : 目標にちょうど到達（todayTotalMg === goalMg）
 * - 'exceeded'       : 目標を超過（todayTotalMg > goalMg）
 */
// 浮動小数点演算の誤差（例: 200.4 - 200 = 0.4000000000000057）が
// そのまま画面に表示されないよう、小数第1位に丸める。
function roundMg(value) {
  return Math.round(value * 10) / 10
}

export function calculateGoalProgress(todayTotalMg, goalMg) {
  if (goalMg === null || goalMg === undefined) {
    return { status: 'unset' }
  }

  if (goalMg === 0) {
    // 0での除算を避けるため、0mg目標は専用の分岐で扱う。
    return todayTotalMg > 0 ? { status: 'exceeded-zero' } : { status: 'within-zero' }
  }

  // percent / barWidthPercent は表示専用の値であり、四捨五入して算出する。
  // status（normal / reached / exceeded）の判定には使わない。
  const percent = Math.round((todayTotalMg / goalMg) * 100)
  const barWidthPercent = Math.min(percent, 100)

  // statusは実際のmg値同士を比較して判定する。percentの丸め誤差により
  // 「実際は未到達/超過なのにreached扱いになる」ことを防ぐため。
  // 例: 199.6mg/200mg → 99.8% → 丸めで100%だが実際は未到達 → normal
  //     200.4mg/200mg → 100.2% → 丸めで100%だが実際は超過 → exceeded
  if (todayTotalMg < goalMg) {
    return {
      status: 'normal',
      percent,
      barWidthPercent,
      remainingMg: roundMg(goalMg - todayTotalMg),
    }
  }

  if (todayTotalMg === goalMg) {
    return { status: 'reached', percent, barWidthPercent }
  }

  return {
    status: 'exceeded',
    percent,
    barWidthPercent,
    overMg: roundMg(todayTotalMg - goalMg),
  }
}
