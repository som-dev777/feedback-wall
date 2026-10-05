import './env.js'; // must stay first: loads OPENAI_API_KEY before other modules read it
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';
import { createFeedback, listFeedbacks, latestFeedbacks } from './db.js';
import { isSummaryConfigured, summarizeNotes } from './summary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
// Hosting platforms (Railway) set PORT; locally we use 3000
const PORT = process.env.PORT || 3000;

const MAX_MESSAGE = 280;
const MAX_NAME = 40;
const SUMMARY_NOTES = 10;

// Gzip responses, except the live stream: compression buffers output,
// which would hold back live notes instead of sending them immediately
app.use(
  compression({
    filter: (req, res) => req.path !== '/api/feedbacks/stream' && compression.filter(req, res),
  }),
);

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

// Last summary, reused while no new note has arrived (saves OpenAI calls and cost)
let cachedSummary = null; // { latestId, result }
let pendingSummary = null; // { latestId, promise } while a request to OpenAI is running

app.post('/api/summary', async (req, res) => {
  if (!isSummaryConfigured()) {
    return res.status(503).json({ error: 'Summaries are not set up on this server' });
  }
  const notes = latestFeedbacks(SUMMARY_NOTES);
  if (notes.length === 0) {
    return res.status(400).json({ error: 'There is no feedback to summarize yet' });
  }

  const latestId = notes[0].id;
  if (cachedSummary?.latestId === latestId) {
    return res.json(cachedSummary.result);
  }

  try {
    // Several clicks at once share one OpenAI request
    if (pendingSummary?.latestId !== latestId) {
      const promise = summarizeNotes(notes).then((ai) => ({
        ...ai,
        noteCount: notes.length,
        generatedAt: new Date().toISOString(),
      }));
      pendingSummary = { latestId, promise };
    }
    const result = await pendingSummary.promise;
    cachedSummary = { latestId, result };
    res.json(result);
  } catch (err) {
    console.error('Summary failed:', err.message);
    res.status(502).json({ error: 'Could not get a summary right now. Please try again.' });
  } finally {
    if (pendingSummary?.latestId === latestId) pendingSummary = null;
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
const clientDist = path.join(__dirname, '..', 'client', 'dist');
// Files in /assets have a content hash in their name, so browsers can cache them for a year
app.use('/assets', express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y' }));
app.use(express.static(clientDist));

// Body-parsing errors end up here; answer in JSON instead of an HTML page
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
