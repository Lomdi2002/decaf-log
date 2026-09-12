import { Link } from 'react-router-dom'

function StreakCard({ streak }) {
  if (streak.status === 'unset') {
    return (
      <section className="card streak-card">
        <p className="streak-label">連続達成</p>
        <p>目標を設定すると連続達成日数を確認できます。</p>
        <Link to="/settings" className="button button-secondary">
          目標を設定する
        </Link>
      </section>
    )
  }

  return (
    <section className="card streak-card">
      <p className="streak-label">連続達成</p>
      <p className="streak-value">{streak.days}日</p>
    </section>
  )
}

export default StreakCard
