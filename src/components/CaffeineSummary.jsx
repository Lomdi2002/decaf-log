function CaffeineSummary({ totalMg }) {
  return (
    <section className="card summary-card">
      <p className="summary-label">今日のカフェイン</p>
      <p className="summary-value">{totalMg} mg</p>
    </section>
  )
}

export default CaffeineSummary
