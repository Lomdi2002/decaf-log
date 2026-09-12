import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import RecordList from '../components/RecordList'
import DailyChart from '../components/DailyChart'
import { fetchRecords, deleteRecord } from '../lib/caffeineRecords'
import { buildDailyTotals } from '../lib/dailyTotals'

const FETCH_ERROR_MESSAGE = 'データの取得に失敗しました。もう一度お試しください。'
const DELETE_ERROR_MESSAGE = '記録の削除に失敗しました。もう一度お試しください。'

function HistoryPage() {
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const loadRecords = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const data = await fetchRecords()
      setRecords(data)
    } catch (error) {
      console.error('履歴の取得に失敗しました:', error)
      setLoadError(FETCH_ERROR_MESSAGE)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  async function handleDelete(id) {
    setDeleteError('')
    try {
      await deleteRecord(id)
      setRecords((prev) => prev.filter((record) => record.id !== id))
    } catch (error) {
      console.error('記録の削除に失敗しました:', error)
      setDeleteError(DELETE_ERROR_MESSAGE)
    }
  }

  return (
    <div className="page">
      <h2>摂取履歴</h2>

      {isLoading && <p>読み込み中...</p>}

      {!isLoading && loadError && (
        <div className="page-error">
          <p>{loadError}</p>
          <button type="button" className="button button-secondary" onClick={loadRecords}>
            再読み込み
          </button>
        </div>
      )}

      {!isLoading && !loadError && deleteError && <p className="form-error">{deleteError}</p>}

      {/* Version 1.3: 今日を含む直近7日間の日別グラフ。記録が0件の日は0mgとして
          表示し、直近7日間に記録が1件もない場合でも7日分のグラフを表示する。
          既存の記録一覧・Empty状態の表示ロジックには影響させない。 */}
      {!isLoading && !loadError && <DailyChart data={buildDailyTotals(records)} />}

      {!isLoading && !loadError && records.length === 0 && (
        <div className="empty-state">
          <p>
            まだ記録がありません。
            <br />
            カフェインを記録すると、ここに履歴が表示されます。
          </p>
          <Link to="/record" className="button button-primary">
            ＋ カフェインを記録
          </Link>
        </div>
      )}

      {!isLoading && !loadError && records.length > 0 && (
        <RecordList records={records} onDelete={handleDelete} />
      )}
    </div>
  )
}

export default HistoryPage
