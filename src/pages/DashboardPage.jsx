import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CaffeineSummary from '../components/CaffeineSummary'
import RecentRecords from '../components/RecentRecords'
import { fetchRecords } from '../lib/caffeineRecords'
import { isToday } from '../lib/dateUtils'

const FETCH_ERROR_MESSAGE = 'データの取得に失敗しました。もう一度お試しください。'
const RECENT_RECORDS_LIMIT = 3

function DashboardPage() {
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadRecords = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const data = await fetchRecords()
      setRecords(data)
    } catch (error) {
      console.error('ダッシュボードの取得に失敗しました:', error)
      setLoadError(FETCH_ERROR_MESSAGE)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  if (isLoading) {
    return (
      <div className="page">
        <p>読み込み中...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="page">
        <div className="page-error">
          <p>{loadError}</p>
          <button type="button" className="button button-secondary" onClick={loadRecords}>
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  // FR-005: 今日のカフェイン合計はブラウザのローカルタイムゾーンにおける
  // 「今日」を基準に判定する（UTC日付文字列の切り出しでは判定しない）。
  const todayTotalMg = records
    .filter((record) => isToday(record.consumedAt))
    .reduce((sum, record) => sum + record.caffeineMg, 0)

  const recentRecords = records.slice(0, RECENT_RECORDS_LIMIT)

  return (
    <div className="page">
      <CaffeineSummary totalMg={todayTotalMg} />

      {records.length === 0 ? (
        <div className="empty-state">
          <p>
            今日はまだ記録がありません。
            <br />
            カフェインを記録してみましょう。
          </p>
        </div>
      ) : (
        <RecentRecords records={recentRecords} />
      )}

      <Link to="/record" className="button button-primary">
        ＋ カフェインを記録
      </Link>
    </div>
  )
}

export default DashboardPage
