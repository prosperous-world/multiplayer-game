# Orbit Arena

A live multiplayer energy-collection game. Requires Node.js 20 or newer; no dependencies, accounts, or database needed.

```sh
npm start
```

Open port 3000 in your browser. Join the public arena, or enter the same private room code on multiple devices. Share the invite link to bring friends into your room. Use WASD, arrow keys, or the mobile direction buttons to collect energy. Each orb awards 10 points; rounds reset every 90 seconds. Solo practice also works without a server connection once the page loads.

`npm test` runs integration checks. `npm run dev` restarts the server when files change. Set `PORT` to choose another listening port. When hosting, support long-lived Server-Sent Event responses without buffering. Room state is in memory and resets on server restart. This prototype uses a single server process, supports 12 players per room, and has no persistent accounts or cross-server room synchronization.
