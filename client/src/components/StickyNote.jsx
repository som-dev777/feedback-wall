// Neon accents for the label dot; chosen per note from its id
const PALETTE = ['#D4FF3A', '#FFE14D', '#5CFF8A', '#8C8CFF', '#FF7AC6']

// created_at is UTC without a timezone marker, e.g. "2026-10-04 09:15:32"
function timeAgo(createdAt) {
  const created = new Date(createdAt.replace(' ', 'T') + 'Z')
  const minutes = Math.floor((Date.now() - created.getTime()) / 60000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  return `${days} d ago`
}

function StickyNote({ note }) {
  const accent = PALETTE[note.id % PALETTE.length]

  return (
    <article className="note panel" style={{ '--note-accent': accent }}>
      <span className="chip">
        <span className="dot" style={{ background: accent }} />
        {note.name}
      </span>
      <p className="note-message">{note.message}</p>
      <footer className="note-time">{timeAgo(note.created_at)}</footer>
    </article>
  )
}

export default StickyNote
