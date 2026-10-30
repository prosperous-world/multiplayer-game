import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));

export async function build({ backend = process.env.GAME_SERVER_URL, output = path.join(root, '.vercel/output') } = {}) {
  let url;
  try { url = new URL(backend); } catch { throw new Error('Set GAME_SERVER_URL to the deployed game server HTTPS origin before building.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('GAME_SERVER_URL must be an HTTPS origin without credentials, a path, a query, or a fragment.');
  }
  // Vercel Build Output API: static frontend plus same-origin API proxy.
  // The persistent game server runs separately; never bundle its in-memory rooms as functions.
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(path.join(root, 'public'), path.join(output, 'static'), { recursive: true });
  await writeFile(path.join(output, 'config.json'), JSON.stringify({
    version: 3,
    routes: [
      { src: '/api/(.*)', dest: `${url.origin}/api/$1` },
      { handle: 'filesystem' }
    ]
  }, null, 2) + '\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build().catch(error => { console.error(error.message); process.exitCode = 1; });
}
