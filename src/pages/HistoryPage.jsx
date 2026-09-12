import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import RecordList from '../components/RecordList'
import { fetchRecords, deleteRecord } from '../lib/caffeineRecords'

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
