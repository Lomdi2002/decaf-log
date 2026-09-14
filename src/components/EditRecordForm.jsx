import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateRecord } from '../lib/caffeineRecords'
import { toDatetimeLocalValue } from '../lib/dateUtils'
import { validateRecordInput } from '../lib/recordValidation'

const SUBMIT_ERROR_MESSAGE = '記録の更新に失敗しました。もう一度お試しください。'

function EditRecordForm({ record }) {
  const navigate = useNavigate()
  const [drinkName, setDrinkName] = useState(record.drinkName)
  const [caffeineMg, setCaffeineMg] = useState(String(record.caffeineMg))
  const [consumedAt, setConsumedAt] = useState(() => toDatetimeLocalValue(record.consumedAt))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSubmitting) {
      // 更新中の二重送信を防止する
      return
    }

    const nextErrors = validateRecordInput({ drinkName, caffeineMg, consumedAt })
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setSubmitError('')
    setIsSubmitting(true)

    try {
      await updateRecord(record.id, {
        drinkName: drinkName.trim(),
        caffeineMg: Number(caffeineMg),
        consumedAt: new Date(consumedAt).toISOString(),
      })
      navigate('/history')
    } catch (error) {
      console.error('記録の更新に失敗しました:', error)
      setSubmitError(SUBMIT_ERROR_MESSAGE)
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    navigate('/history')
  }

  return (
    <form className="record-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="drinkName">飲み物</label>
        <input
          id="drinkName"
          type="text"
          value={drinkName}
          onChange={(event) => setDrinkName(event.target.value)}
          placeholder="コーヒー"
          disabled={isSubmitting}
        />
        {errors.drinkName && <p className="form-error">{errors.drinkName}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="caffeineMg">カフェイン量</label>
        <div className="input-with-suffix">
          <input
            id="caffeineMg"
            type="number"
            inputMode="decimal"
            min="0"
            value={caffeineMg}
            onChange={(event) => setCaffeineMg(event.target.value)}
            placeholder="100"
            disabled={isSubmitting}
          />
          <span className="input-suffix">mg</span>
        </div>
        {errors.caffeineMg && <p className="form-error">{errors.caffeineMg}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="consumedAt">摂取日時</label>
        <input
          id="consumedAt"
          type="datetime-local"
          value={consumedAt}
          onChange={(event) => setConsumedAt(event.target.value)}
          disabled={isSubmitting}
        />
        {errors.consumedAt && <p className="form-error">{errors.consumedAt}</p>}
      </div>

      {submitError && <p className="form-error">{submitError}</p>}

      <button type="submit" className="button button-primary" disabled={isSubmitting}>
        {isSubmitting ? '保存中...' : '保存'}
      </button>
      <button
        type="button"
        className="button button-secondary"
        onClick={handleCancel}
        disabled={isSubmitting}
      >
        キャンセル
      </button>
    </form>
  )
}

export default EditRecordForm
