import { Link } from 'react-router-dom'
import { calculateGoalProgress } from '../lib/goalProgress'

function GoalProgress({ todayTotalMg, goalMg }) {
  const progress = calculateGoalProgress(todayTotalMg, goalMg)

  if (progress.status === 'unset') {
    return (
      <section className="card goal-progress">
        <p>1日の目標が設定されていません。</p>
        <Link to="/settings" className="button button-secondary">
          目標を設定する
        </Link>
      </section>
    )
  }

  if (progress.status === 'within-zero') {
    return (
      <section className="card goal-progress">
        <p>カフェイン摂取なし</p>
        <p>目標内</p>
      </section>
    )
  }

  if (progress.status === 'exceeded-zero') {
    return (
      <section className="card goal-progress goal-progress-warning">
        <p>目標を超えています</p>
      </section>
    )
  }

  // ここから先は status: 'normal' | 'reached' | 'exceeded'。
  // 'reached' と 'exceeded' はどちらも「100%以上」として警告表示にする。
  const isWarning = progress.status === 'reached' || progress.status === 'exceeded'

  return (
    <section className={`card goal-progress${isWarning ? ' goal-progress-warning' : ''}`}>
      <p className="goal-progress-meta">
        <span>今日 {todayTotalMg}mg</span>
        <span>目標 {goalMg}mg</span>
      </p>

      <div
        className="goal-progress-bar-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.barWidthPercent}
      >
        <div className="goal-progress-bar-fill" style={{ width: `${progress.barWidthPercent}%` }} />
      </div>

      <p className="goal-progress-percent">{progress.percent}%</p>

      {progress.status === 'normal' && <p>あと{progress.remainingMg}mg</p>}
      {progress.status === 'reached' && <p>目標上限に達しました</p>}
      {progress.status === 'exceeded' && <p>目標を{progress.overMg}mg超えています</p>}
    </section>
  )
}

export default GoalProgress
