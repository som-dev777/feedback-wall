import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createFeedback, listFeedbacks } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
// Hosting platforms (Railway) set PORT; locally we use 3000
const PORT = process.env.PORT || 3000;

const MAX_MESSAGE = 280;
const MAX_NAME = 40;

app.use(express.json());

// Open SSE connections (Express response objects)
const clients = [];

function broadcast(note) {
  const payload = `data: ${JSON.stringify(note)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

// Returns { name, message } on success or { error } on failure
function validateFeedback(body) {
  const { name, message } = body ?? {};

  if (typeof message !== 'string') {
    return { error: 'Message is required' };
  }
  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    return { error: 'Message cannot be empty' };
  }
  if (trimmedMessage.length > MAX_MESSAGE) {
    return { error: `Message must be at most ${MAX_MESSAGE} characters` };
  }

  if (name !== undefined && name !== null && typeof name !== 'string') {
    return { error: 'Name must be text' };
  }
  const trimmedName = (name ?? '').trim();
  if (trimmedName.length > MAX_NAME) {
    return { error: `Name must be at most ${MAX_NAME} characters` };
  }

  return { name: trimmedName || 'Anonymous', message: trimmedMessage };
}

app.post('/api/feedbacks', (req, res) => {
  const result = validateFeedback(req.body);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  try {
    const note = createFeedback(result.name, result.message);
    broadcast(note);
    res.status(201).json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/api/feedbacks', (req, res) => {
  try {
    res.json(listFeedbacks());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/api/feedbacks/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  clients.push(res);

  // Comment line keeps proxies/browsers from closing an idle connection
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const index = clients.indexOf(res);
    if (index !== -1) clients.splice(index, 1);
  });
});

// In production, Express also serves the built React app (client/dist).
// In development Vite serves the client, and this folder may not exist.
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// Malformed JSON bodies end up here; answer in JSON instead of an HTML page
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
