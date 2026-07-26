export function LoadingIndicator({ status, progress }) {
  const percent = Math.round((progress ?? 0) * 100)

  return (
    <div className="loading-screen">
      <p className="loading-emoji" aria-hidden="true">
        📖
      </p>
      <p className="loading-status">よみとっているよ…</p>
      <div className="loading-bar">
        <div className="loading-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="loading-percent">{percent}%</p>
      {status && <p className="loading-detail">{status}</p>}
    </div>
  )
}
