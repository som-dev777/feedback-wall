import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load secrets such as OPENAI_API_KEY from server/.env (gitignored).
// Variables already set in the real environment (Railway, Playwright) are kept.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}
