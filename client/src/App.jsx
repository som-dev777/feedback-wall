import { useState } from 'react'
import FeedbackForm from './components/FeedbackForm.jsx'
import FeedbackWall from './components/FeedbackWall.jsx'

function App() {
  // Shared notes list; FeedbackWall fills it from the API and the live stream
  const [notes, setNotes] = useState([])

  return (
    <div className="layout">
      <aside className="sidebar panel">
        <div className="brand">
          <h1 className="logo">Feedback Wall</h1>
          <p className="tagline">A live sticky-note board</p>
        </div>
        <p className="section-label">Post a note</p>
        <FeedbackForm />
      </aside>

      <main className="main">
        <header className="topbar panel">
          <span className="status">
            <span className="dot dot-yellow" /> Real-time wall
          </span>
          <span className="status">
            <span className="dot dot-green" /> {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </span>
        </header>

        <section className="hero panel">
          <p className="hero-text">
            Leave a note.
            <br />
            Everyone sees it instantly.
          </p>
        </section>

        <FeedbackWall notes={notes} setNotes={setNotes} />
      </main>
    </div>
  )
}

export default App
