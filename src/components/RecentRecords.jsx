import { Link } from 'react-router-dom'
import { formatTime } from '../lib/dateUtils'

function RecentRecords({ records }) {
  return (
    <section className="card">
      <h3>最近の記録</h3>
      <ul className="record-list">
        {records.map((record) => (
          <li key={record.id} className="record-item">
            <div className="record-item-info">
              <p className="record-item-drink">{record.drinkName}</p>
              <p className="record-item-meta">
                <span>{record.caffeineMg}mg</span>
                <span>{formatTime(record.consumedAt)}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
      <Link to="/history" className="button button-secondary">
        すべて見る
      </Link>
    </section>
  )
}

export default RecentRecords
