import { useEffect, useState } from 'react'
import StickyNote from './StickyNote.jsx'

function FeedbackWall({ notes, setNotes }) {
  const [loadError, setLoadError] = useState('')
  // Bumped every minute so relative times ("5 min ago") stay current
  const [, setTick] = useState(0)

  useEffect(() => {
    // Open the stream first so no note is missed while the initial list loads
    const source = new EventSource('/api/feedbacks/stream')
    source.onmessage = (event) => {
      const note = JSON.parse(event.data)
      setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [note, ...prev]))
    }

    fetch('/api/feedbacks')
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => {
        // Keep any notes that arrived via the stream but aren't in the fetched list
        setNotes((prev) => {
          const ids = new Set(data.map((n) => n.id))
          return [...prev.filter((n) => !ids.has(n.id)), ...data]
        })
      })
      .catch(() => setLoadError('Could not load feedback. Is the server running?'))

    const timer = setInterval(() => setTick((t) => t + 1), 60000)

    return () => {
      source.close()
      clearInterval(timer)
    }
  }, [setNotes])

  if (loadError && notes.length === 0) {
    return <p className="wall-message panel">{loadError}</p>
  }
  if (notes.length === 0) {
    return <p className="wall-message panel">No feedback yet. Be the first!</p>
  }

  return (
    <section className="wall">
      {notes.map((note) => (
        <StickyNote key={note.id} note={note} />
      ))}
    </section>
  )
}

export default FeedbackWall
