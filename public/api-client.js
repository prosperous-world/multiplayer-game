export async function joinGame(player, fetchImpl = fetch) {
  const response = await fetchImpl('/api/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(player),
    signal: AbortSignal.timeout(60000)
  });
  const body = await response.text();
  if (response.status === 508 || /^\s*infinite loop/i.test(body)) {
    throw new Error('Multiplayer is unavailable due to a server routing loop. Please contact the site owner or try solo practice.');
  }
  let data;
  try { data = JSON.parse(body); } catch {
    throw new Error('The multiplayer server is unavailable. Please try again shortly or play a solo round.');
  }
  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Could not join the arena. Please try again shortly.');
  }
  if (typeof data?.id !== 'string' || !data.id || typeof data?.room !== 'string' || !data.room) {
    throw new Error('The multiplayer server returned an invalid session. Please contact the site owner or try solo practice.');
  }
  return { id: data.id, room: data.room };
}
