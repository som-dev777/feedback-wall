import { useState } from 'react'

const SENTIMENTS = [
  { key: 'positive', label: 'Positive' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'negative', label: 'Negative' },
]

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function FeedbackSummary({ noteCount }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSummarize() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/summary', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setSummary(data)
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Could not reach the server' : err.message)
    } finally {
      setLoading(false)
    }
  }

  const sentimentTotal = summary
    ? SENTIMENTS.reduce((sum, s) => sum + summary.sentiment[s.key], 0)
    : 0
  const maxTheme = summary ? Math.max(1, ...summary.themes.map((t) => t.count)) : 1

  return (
    <section className="summary panel" aria-labelledby="summary-title">
      <header className="summary-header">
        <div>
          <h2 id="summary-title" className="summary-title">
            <span className="dot dot-accent" /> AI summary
          </h2>
          <p className="summary-hint">
            {summary
              ? `Based on the ${summary.noteCount} most recent notes · ${formatTime(summary.generatedAt)}`
              : 'Summarize the 10 most recent notes.'}
          </p>
        </div>
        <button type="button" onClick={handleSummarize} disabled={loading || noteCount === 0}>
          {loading ? 'Summarizing...' : summary ? 'Refresh' : 'Summarize'}
        </button>
      </header>

      {error && <p className="summary-error">{error}</p>}

      {summary && (
        <div className="summary-body">
          <p className="summary-text">{summary.summary}</p>

          <div className="summary-visuals">
            <div className="summary-block">
              <p className="section-label">Sentiment</p>
              {/* One bar split by share of positive / neutral / negative notes */}
              <div className="sentiment-bar" role="img" aria-label={SENTIMENTS.map((s) => `${summary.sentiment[s.key]} ${s.label.toLowerCase()}`).join(', ')}>
                {SENTIMENTS.map((s) =>
                  summary.sentiment[s.key] > 0 ? (
                    <span
                      key={s.key}
                      className={`sentiment-${s.key}`}
                      style={{ flexGrow: summary.sentiment[s.key] }}
                    />
                  ) : null,
                )}
                {sentimentTotal === 0 && <span className="sentiment-neutral" style={{ flexGrow: 1 }} />}
              </div>
              <ul className="sentiment-legend">
                {SENTIMENTS.map((s) => (
                  <li key={s.key} data-sentiment={s.key}>
                    <span className={`dot sentiment-${s.key}`} />
                    {s.label} <strong>{summary.sentiment[s.key]}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div className="summary-block">
              <p className="section-label">Themes</p>
              {summary.themes.length === 0 ? (
                <p className="summary-hint">No clear themes yet.</p>
              ) : (
                <ul className="theme-list">
                  {summary.themes.map((t) => (
                    <li key={t.label} className="theme-row">
                      <span className="theme-label">{t.label}</span>
                      <span className="theme-track">
                        <span className="theme-fill" style={{ width: `${(t.count / maxTheme) * 100}%` }} />
                      </span>
                      <span className="theme-count">{t.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default FeedbackSummary
