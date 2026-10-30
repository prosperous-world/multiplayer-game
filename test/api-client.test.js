import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinGame } from '../public/api-client.js';

test('join reports a routing loop instead of leaking a JSON parser exception', async () => {
  for (const status of [200, 508]) {
    await assert.rejects(joinGame({name:'43234',room:'23423423'}, async () => new Response('Infinite loop detected', {status})), /server routing loop/);
  }
});

test('join handles non-JSON upstream responses, invalid sessions, and API errors', async () => {
  for (const status of [200, 502, 503]) {
    await assert.rejects(joinGame({}, async () => new Response('<html>Unavailable</html>', {status})), /server is unavailable/);
  }
  await assert.rejects(joinGame({}, async () => Response.json({})), /invalid session/);
  await assert.rejects(joinGame({}, async () => Response.json({error:'Room is full.'},{status:409})), /Room is full/);
});

test('numeric names and room codes are sent unchanged and valid sessions are accepted', async () => {
  const player = {name:'43234',room:'23423423'};
  const session = await joinGame(player, async (url, options) => {
    assert.equal(url, '/api/join');
    assert.deepEqual(JSON.parse(options.body), player);
    return Response.json({id:'player-id', room:player.room});
  });
  assert.deepEqual(session, {id:'player-id',room:player.room});
});
