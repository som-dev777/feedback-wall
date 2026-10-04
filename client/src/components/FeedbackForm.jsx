import { useState } from 'react'

const MAX_MESSAGE = 280
const MAX_NAME = 40

function FeedbackForm() {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const trimmedLength = message.trim().length
  const canSubmit = trimmedLength > 0 && message.length <= MAX_MESSAGE && !sending

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return

    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong')
      }
      // The new note reaches the wall through the live stream
      setName('')
      setMessage('')
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Could not reach the server' : err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="feedback-form" onSubmit={handleSubmit}>
      <input
        type="text"
        aria-label="Your name"
        placeholder="Your name (optional)"
        maxLength={MAX_NAME}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        aria-label="Your feedback"
        placeholder="Write your feedback..."
        rows={5}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="form-footer">
        <span className={message.length > MAX_MESSAGE ? 'counter over' : 'counter'}>
          {message.length}/{MAX_MESSAGE}
        </span>
        <button type="submit" disabled={!canSubmit}>
          {sending ? 'Posting...' : 'Post'}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  )
}

export default FeedbackForm
