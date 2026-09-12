import { useCallback, useEffect, useState } from 'react'
import SettingsForm from '../components/SettingsForm'
import { fetchGoal } from '../lib/appSettings'

const FETCH_ERROR_MESSAGE = 'データの取得に失敗しました。もう一度お試しください。'

function SettingsPage() {
  const [goal, setGoal] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadGoal = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const data = await fetchGoal()
      setGoal(data)
    } catch (error) {
      console.error('設定の取得に失敗しました:', error)
      setLoadError(FETCH_ERROR_MESSAGE)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGoal()
  }, [loadGoal])

  return (
    <div className="page">
      <h2>設定</h2>

      {isLoading && <p>読み込み中...</p>}

      {!isLoading && loadError && (
        <div className="page-error">
          <p>{loadError}</p>
          <button type="button" className="button button-secondary" onClick={loadGoal}>
            再読み込み
          </button>
        </div>
      )}

      {!isLoading && !loadError && (
        // 再読み込みで取得した値が変わった場合にフォームの初期値を反映させるため、
        // 取得した値をkeyに用いて明示的に再マウントする。
        <SettingsForm key={String(goal)} initialGoal={goal} />
      )}
    </div>
  )
}

export default SettingsPage
