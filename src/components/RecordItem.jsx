import { formatDate, formatTime } from '../lib/dateUtils'

function RecordItem({ record, onDelete }) {
  function handleDeleteClick() {
    const confirmed = window.confirm('この記録を削除しますか？')
    if (confirmed) {
      onDelete(record.id)
    }
  }

  return (
    <li className="record-item">
      <div className="record-item-info">
        <p className="record-item-drink">{record.drinkName}</p>
        <p className="record-item-meta">
          <span>{record.caffeineMg}mg</span>
          <span>{formatDate(record.consumedAt)}</span>
          <span>{formatTime(record.consumedAt)}</span>
        </p>
      </div>
      <button type="button" className="button button-danger" onClick={handleDeleteClick}>
        削除
      </button>
    </li>
  )
}

export default RecordItem
