import { useState } from 'react'
import { saveGoal } from '../lib/appSettings'

const SAVE_ERROR_MESSAGE = '設定の保存に失敗しました。もう一度お試しください。'
const SAVE_SUCCESS_MESSAGE = '保存しました。'

// 未入力（未設定のまま保存する場合）は許可する。
// 数値を入力する場合、負数・数値として扱えない値はエラーとする。
function validate(goalInput) {
  if (goalInput.trim() === '') {
    return ''
  }

  if (Number.isNaN(Number(goalInput)) || Number(goalInput) < 0) {
    return '0以上の数値を入力してください。'
  }

  return ''
}

function toInputValue(goal) {
  return goal === null || goal === undefined ? '' : String(goal)
}

function SettingsForm({ initialGoal }) {
  const [goalInput, setGoalInput] = useState(() => toInputValue(initialGoal))
  const [validationError, setValidationError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    setGoalInput(event.target.value)
    // 入力内容を変更したら、前回の保存成功メッセージをクリアする（タイマーによる自動消去はしない）。
    setSuccessMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSubmitting) {
      // 二重送信を防止する
      return
    }

    // 次の保存処理を開始した時点で、前回の成功メッセージをクリアする。
    setSuccessMessage('')

    const nextValidationError = validate(goalInput)
    setValidationError(nextValidationError)

    if (nextValidationError) {
      return
    }

    // 空欄はNULL（未設定）として保存する。0は有効な設定値としてそのまま保存する。
    const goalMg = goalInput.trim() === '' ? null : Number(goalInput)

    setSubmitError('')
    setIsSubmitting(true)

    try {
      await saveGoal(goalMg)
      setSuccessMessage(SAVE_SUCCESS_MESSAGE)
    } catch (error) {
      console.error('設定の保存に失敗しました:', error)
      setSubmitError(SAVE_ERROR_MESSAGE)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="settings-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="dailyGoal">1日のカフェイン目標</label>
        <div className="input-with-suffix">
          <input
            id="dailyGoal"
            type="text"
            inputMode="decimal"
            value={goalInput}
            onChange={handleChange}
            placeholder="未設定"
            disabled={isSubmitting}
          />
          <span className="input-suffix">mg</span>
        </div>
        {validationError && <p className="form-error">{validationError}</p>}
      </div>

      {submitError && <p className="form-error">{submitError}</p>}
      {successMessage && <p className="form-success">{successMessage}</p>}

      <button type="submit" className="button button-primary" disabled={isSubmitting}>
        {isSubmitting ? '保存中...' : '保存'}
      </button>
    </form>
  )
}

export default SettingsForm
