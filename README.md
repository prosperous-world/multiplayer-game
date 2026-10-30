# Orbit Arena

A live multiplayer energy-collection game. Requires Node.js 20 or newer; no dependencies, accounts, or database needed.

```sh
npm start
```

Open port 3000 in your browser. Join the public arena, or enter the same private room code on multiple devices. Share the invite link to bring friends into your room. Use WASD, arrow keys, or the mobile direction buttons to collect energy. Each orb awards 10 points; rounds reset every 90 seconds. Solo practice also works without a server connection once the page loads.

`npm test` runs integration checks. `npm run dev` restarts the server when files change. Set `PORT` to choose another listening port. When hosting, support long-lived Server-Sent Event responses without buffering. Room state is in memory and resets on server restart. This prototype uses a single server process, supports 12 players per room, and has no persistent accounts or cross-server room synchronization.

## Deploy the frontend to Vercel

Multiplayer requires a persistent Node process. Vercel serves the frontend and forwards `/api/*` requests to that server; deploying the in-memory game loop as independent serverless functions would split room state.

1. Push these deployment files to GitHub. In Render, create a Blueprint from this repository and select the `work` branch containing the game. The included `render.yaml` creates one Node web service. Keep it at one instance because rooms are stored in memory.
2. Wait for Render to report the service healthy. Copy its public HTTPS origin. The free plan sleeps when idle and restarts clear rooms; initial connections can take time during a cold start. An always-on plan is optional and has a separate cost.
3. Import this repository into Vercel. Select framework **Other**, the repository root, and build command `npm run build`. Leave the output directory override disabled: the build writes Vercel Build Output API artifacts to `.vercel/output`.
4. Set `GAME_SERVER_URL` in Vercel to the Render HTTPS origin, with no path (for example, `https://your-service.onrender.com`). Set it for both Preview and Production, then deploy. Use `work` as the production branch while that is the branch containing the game.
5. Open the Vercel deployment in two browser sessions, join the same room, and verify both names appear and movement and scores update in both. API traffic, including event streams, stays same-origin through Vercel's proxy. The client reconnects its event stream if the proxy closes a long connection.

For a CLI deployment after secure Vercel login, from this directory run `vercel env add GAME_SERVER_URL production`, enter the server origin, then run `vercel --prod`. Do not put account tokens in tracked files or chat.

`GAME_SERVER_URL=https://your-service.onrender.com npm run build` validates and builds the frontend locally. This only generates deployment artifacts; it does not create a server or publish a site. A missing or invalid server URL intentionally fails the build so a broken multiplayer deployment is not silently published.

### A join request reports “Infinite loop”

This indicates an upstream routing loop, not an invalid player name or room code. Check **Vercel → Settings → Environment Variables → GAME_SERVER_URL**. It must be the Render game service's HTTPS origin, not the Vercel site's address or a custom domain that routes back to Vercel. Correct it for the affected deployment environment and redeploy; the proxy destination is embedded at build time. The build rejects `.vercel.app` addresses and known Vercel frontend aliases. Custom domains not present in Vercel's build environment still need to be checked manually.
