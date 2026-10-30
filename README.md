# NexPlay

Real time multiplayer games in the browser: Ayo, Whot!, Connect Four, Tic Tac Toe, Rock Paper Scissors, Word Race, Quick Math and Trivia. Play with friends using a room code, in a quick match, or against the computer.

Made by NexKeys Agency.

## Stack

- React Router 8 (framework mode, static: public pages are prerendered for SEO, the app runs as a single page app)
- React 19, TypeScript, Vite
- Firebase Authentication (guest plus Google) and Realtime Database
- Motion and GSAP for animation

## How a room works

1. The host creates a room. A five character code (no 0, O, 1, I or L) is reserved with a database transaction, so two rooms can never share a code.
2. Players join with the code or link. Presence uses `onDisconnect`, so a closed tab shows as away.
3. When the host starts, the host's device runs the match (`app/lib/host.ts`). Players send moves to `rooms/{code}/moves`, which only the host can read. The host checks every move with the game engine and publishes a spectator view plus a private view for each player, so nobody can see another player's cards or answers.
4. If the host disconnects for five seconds, the next player in seat order takes over from the saved state and the game carries on.
5. Rock Paper Scissors picks are sealed with a SHA 256 fingerprint and revealed together.

Game rules live in `app/engine/games`, one pure state machine per game, with tests in `tests/`.

## Setup

1. In the Firebase console for `nexplay-948af`:
   - Authentication, Sign in method: turn on **Anonymous** and **Google**.
   - Authentication, Settings, Authorized domains: add your Vercel address, for example `nexplay.vercel.app`.
   - Realtime Database, Rules: paste the contents of `database.rules.json` and publish.
2. Import the repository into Vercel. The settings come from `vercel.json`. Optional environment variables:
   - `VITE_SITE_URL`: your public address, used for canonical links and social previews (defaults to `https://nexplay.vercel.app`).
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`: only if you move to another Firebase project.

## Development

Node 24.

```bash
npm install
npm run dev
```

```bash
npm test
npm run typecheck
npm run build
```

To test against the local Firebase emulators instead of the live project (needs Java and `firebase-tools`):

```bash
npx firebase-tools emulators:start --only auth,database
VITE_USE_EMULATORS=1 npm run dev
```

## Credits

Trivia questions in the general packs come from the Open Trivia Database (opentdb.com), CC BY-SA 4.0. Word lists are built from SCOWL.
