import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EditRecordForm from '../components/EditRecordForm'
import { fetchRecordById } from '../lib/caffeineRecords'

const FETCH_ERROR_MESSAGE = 'データの取得に失敗しました。もう一度お試しください。'
const NOT_FOUND_MESSAGE = '指定された記録が見つかりませんでした。'

function EditRecordPage() {
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notFound, setNotFound] = useState(false)

  const loadRecord = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    setNotFound(false)
    try {
      const data = await fetchRecordById(id)
      if (data === null) {
        setNotFound(true)
      } else {
        setRecord(data)
      }
    } catch (error) {
      console.error('記録の取得に失敗しました:', error)
      setLoadError(FETCH_ERROR_MESSAGE)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadRecord()
  }, [loadRecord])

  if (isLoading) {
    return (
      <div className="page">
        <p>読み込み中...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="page">
        <p>{NOT_FOUND_MESSAGE}</p>
        <Link to="/history" className="button button-secondary">
          履歴に戻る
        </Link>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="page">
        <div className="page-error">
          <p>{loadError}</p>
          <button type="button" className="button button-secondary" onClick={loadRecord}>
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <h2>記録を編集</h2>
      <EditRecordForm record={record} />
    </div>
  )
}

export default EditRecordPage
