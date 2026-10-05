// A fake OpenAI server for tests: free, fast and predictable. Never uses a real key.
//   POST /v1/chat/completions  -> canned structured summary of the notes it receives
//   GET  /__last               -> the last request body + auth header (for assertions)
//   GET  /__calls              -> how many completions were requested
//   POST /__fail-next?mode=... -> make the next completion fail ('error' = HTTP 500, 'bad-json' = unparsable)
import http from 'node:http';

const PORT = Number(process.env.MOCK_OPENAI_PORT || 3199);
let last = null;
let calls = 0;
let failNext = null;

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      if (req.method === 'GET' && url.pathname === '/__last') return send(res, 200, last);
      if (req.method === 'GET' && url.pathname === '/__calls') return send(res, 200, { calls });
      if (req.method === 'POST' && url.pathname === '/__fail-next') {
        failNext = url.searchParams.get('mode') || 'error';
        return send(res, 200, { ok: true });
      }
      if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
        calls += 1;
        const body = JSON.parse(raw);
        last = { body, authorization: req.headers.authorization };
        if (failNext) {
          const mode = failNext;
          failNext = null;
          if (mode === 'error') return send(res, 500, { error: { message: 'mock failure' } });
          return send(res, 200, { choices: [{ message: { content: 'not json at all' } }] });
        }
        const notes = JSON.parse(body.messages[1].content);
        const content = {
          summary: `Mock summary of ${notes.length} notes. Newest says: ${notes[0].message}`,
          sentiment: { positive: notes.length - 3, neutral: 2, negative: 1 },
          themes: [
            { label: 'Live updates', count: 4 },
            { label: 'Design', count: 2 },
            { label: 'Mobile', count: 1 },
          ],
        };
        return send(res, 200, { choices: [{ message: { content: JSON.stringify(content) } }] });
      }
      send(res, 404, { error: 'not found' });
    });
  })
  .listen(PORT, () => console.log(`Mock OpenAI on http://localhost:${PORT}`));
