import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from '../scripts/build-vercel.js';

test('Vercel build contains the frontend and routes every API endpoint to the game server', async () => {
  const output = await mkdtemp(path.join(tmpdir(), 'orbit-build-'));
  try {
    await build({ backend: 'https://arena.example.com/', output });
    const config = JSON.parse(await readFile(path.join(output, 'config.json'), 'utf8'));
    assert.equal(config.version, 3);
    for (const endpoint of ['join', 'events', 'move', 'leave']) {
      const route = config.routes[0];
      assert.equal(`/api/${endpoint}`.replace(new RegExp(`^${route.src}$`), route.dest), `https://arena.example.com/api/${endpoint}`);
    }
    assert.match(await readFile(path.join(output, 'static/index.html'), 'utf8'), /Orbit Arena/);
    assert.deepEqual((await readdir(path.join(output, 'static'))).sort(), ['api-client.js', 'app.js', 'index.html', 'style.css']);
    await build({ backend: 'https://replacement.example.com', output });
    assert.match(await readFile(path.join(output, 'config.json'), 'utf8'), /replacement.example.com/);
  } finally { await rm(output, { recursive: true, force: true }); }
});

test('Vercel build rejects proxying API requests back to a frontend alias', async () => {
  for (const backend of ['https://orbit.vercel.app', 'https://orbit-git-work.vercel.app', 'https://play.example.com']) {
    await assert.rejects(build({ backend, frontendHosts: ['https://play.example.com'] }), /would loop/);
  }
});

test('Vercel build fails before publishing when the server address is missing or unsafe', async () => {
  for (const backend of ['', 'not-a-url', 'http://example.com', 'https://user:password@example.com', 'https://example.com/api', 'https://example.com?token=secret', 'https://example.com/#fragment']) {
    await assert.rejects(build({ backend }), /GAME_SERVER_URL/);
  }
});
