// 日付・時刻の表示および「今日」判定をまとめたユーティリティ。
//
// 重要: すべてブラウザのローカルタイムゾーンを基準に判定する。
// consumed_at はSupabase上ではtimestamptz（UTC基準）で保存されるが、
// ここではDateオブジェクトのローカルgetter（getFullYear/getMonth/getDate等）
// のみを使用し、UTCの日付文字列を切り出して比較することはしない。
// これにより、UTCとローカルタイムゾーンの時差による日付のずれを防ぐ。

const pad2 = (value) => String(value).padStart(2, '0')

/**
 * 日付を "YYYY/MM/DD" 形式（ローカルタイムゾーン）で返す。
 */
export function formatDate(dateInput) {
  const date = new Date(dateInput)
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`
}

/**
 * 時刻を "HH:mm" 形式（ローカルタイムゾーン）で返す。
 */
export function formatTime(dateInput) {
  const date = new Date(dateInput)
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/**
 * 対象の日時が「ローカルタイムゾーンにおける今日」かどうかを判定する。
 */
export function isToday(dateInput) {
  const date = new Date(dateInput)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

/**
 * <input type="datetime-local"> の value 属性用に、
 * ローカルタイムゾーンの "YYYY-MM-DDTHH:mm" 文字列を返す。
 * 初期値（現在日時）の生成に使用する。
 */
export function toDatetimeLocalValue(dateInput = new Date()) {
  const date = new Date(dateInput)
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  )
}
