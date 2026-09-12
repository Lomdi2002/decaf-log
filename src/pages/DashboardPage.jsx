import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CaffeineSummary from '../components/CaffeineSummary'
import RecentRecords from '../components/RecentRecords'
import GoalProgress from '../components/GoalProgress'
import { fetchRecords } from '../lib/caffeineRecords'
import { fetchGoal } from '../lib/appSettings'
import { isToday } from '../lib/dateUtils'

const FETCH_ERROR_MESSAGE = 'データの取得に失敗しました。もう一度お試しください。'
const GOAL_FETCH_ERROR_MESSAGE = '目標を取得できませんでした。'
const RECENT_RECORDS_LIMIT = 3

function DashboardPage() {
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // 目標値（Version 1.2）は記録データとは独立して取得・表示する。
  // 目標値の取得中・失敗が「今日の合計」「最近の記録」の表示を妨げないようにするため。
  const [goal, setGoal] = useState(null)
  const [isGoalLoading, setIsGoalLoading] = useState(true)
  const [goalError, setGoalError] = useState('')

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

  const loadGoal = useCallback(async () => {
    setIsGoalLoading(true)
    setGoalError('')
    try {
      const data = await fetchGoal()
      setGoal(data)
    } catch (error) {
      console.error('目標値の取得に失敗しました:', error)
      setGoalError(GOAL_FETCH_ERROR_MESSAGE)
    } finally {
      setIsGoalLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useEffect(() => {
    loadGoal()
  }, [loadGoal])

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

      {isGoalLoading && <p>読み込み中...</p>}
      {!isGoalLoading && goalError && <p className="page-error">{goalError}</p>}
      {!isGoalLoading && !goalError && <GoalProgress todayTotalMg={todayTotalMg} goalMg={goal} />}

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
