import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DrinkPresetPicker from './DrinkPresetPicker'
import { insertRecord } from '../lib/caffeineRecords'
import { toDatetimeLocalValue } from '../lib/dateUtils'

const SUBMIT_ERROR_MESSAGE = '記録の登録に失敗しました。もう一度お試しください。'

function validate({ drinkName, caffeineMg, consumedAt }) {
  const errors = {}

  if (drinkName.trim() === '') {
    errors.drinkName = '飲み物を入力してください。'
  }

  if (caffeineMg === '') {
    errors.caffeineMg = 'カフェイン量を入力してください。'
  } else if (Number.isNaN(Number(caffeineMg)) || Number(caffeineMg) < 0) {
    errors.caffeineMg = '0以上の数値を入力してください。'
  }

  const consumedDate = new Date(consumedAt)
  if (consumedAt === '' || Number.isNaN(consumedDate.getTime())) {
    errors.consumedAt = '摂取日時を入力してください。'
  }

  return errors
}

function RecordForm() {
  const navigate = useNavigate()
  const [drinkName, setDrinkName] = useState('')
  const [caffeineMg, setCaffeineMg] = useState('')
  const [consumedAt, setConsumedAt] = useState(() => toDatetimeLocalValue())
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSubmitting) {
      // 登録中の二重送信を防止する
      return
    }

    const nextErrors = validate({ drinkName, caffeineMg, consumedAt })
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setSubmitError('')
    setIsSubmitting(true)

    try {
      await insertRecord({
        drinkName: drinkName.trim(),
        caffeineMg: Number(caffeineMg),
        consumedAt: new Date(consumedAt).toISOString(),
      })
      navigate('/')
    } catch (error) {
      console.error('記録の登録に失敗しました:', error)
      setSubmitError(SUBMIT_ERROR_MESSAGE)
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    navigate('/')
  }

  // Version 1.5: プリセットは「飲み物」「カフェイン量」へ値をセットするだけの
  // 入力ショートカット。選択中プリセットを表すstateは持たず、選択後も
  // 両欄を自由に手動編集できる（既存のvalidate/handleSubmitは変更しない）。
  function handlePresetSelect(preset) {
    setDrinkName(preset.name)
    setCaffeineMg(String(preset.caffeineMg))
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

      <DrinkPresetPicker onSelect={handlePresetSelect} disabled={isSubmitting} />

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
        {isSubmitting ? '登録中...' : '登録'}
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

export default RecordForm
