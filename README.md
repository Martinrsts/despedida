# Know The Groom - Real-Time Bachelor Party Quiz

A real-time social game where friends compete to prove who knows the groom best.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + Socket.io + TypeScript
- Real-time: Socket.io events and server-authoritative game state

## Roles and Routes

- Host (groom): `/host`
- Players: `/player`
- Public display screen: `/display`

All roles join the same room code and stay synchronized in real time.

## Core Flow

1. Lobby with room code + connected players
2. Host starts game (8 rounds)
3. Host picks one question from 5 generated options
4. Players answer once within 25 seconds
5. Display shows anonymous answers
6. Host selects one, many, or zero correct answers
7. Reveal authors + scoring
8. Leaderboard shown on display
9. Repeat until round 8, then show podium + fun awards

## Required Socket Events

Implemented and used:

- `join_room`
- `start_game`
- `new_round`
- `submit_answer`
- `host_select_answers`
- `update_scores`
- `game_finished`

Additional helper events:

- `state_sync`
- `add_custom_question`
- `host_select_question`
- `host_continue`

## Scoring

- +1 point for each correct answer
- +1 bonus point if fewer than 30% of active players answered correctly

## Questions

- Includes 45 predefined light/humorous questions
- Categories: `safe`, `fun`, `spicy`
- Host can add up to 20 custom questions in lobby
- If custom category missing, default is `fun`
- Round candidate generation mixes predefined + custom questions
- No repeated questions in the same game

## Local Run

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Copy and adjust as needed:

- Root: `.env.example`
- Server: `apps/server/.env.example`
- Web: `apps/web/.env.example`

### 3) Run backend and frontend

```bash
npm run dev:server
```

In a second terminal:

```bash
npm run dev:web
```

- Server default: http://localhost:4000
- Web default: http://localhost:5173

### 4) Open role routes

- Host: http://localhost:5173/host
- Player: http://localhost:5173/player
- Display: http://localhost:5173/display

## Deployment (Render)

Two services are recommended:

1. **Web Service** for Node server (`apps/server`)
2. **Static Site** for React app (`apps/web`)

### Server settings

- Build command: `npm install && npm run build -w apps/server`
- Start command: `npm run start -w apps/server`
- Env vars:
  - `PORT` (Render provides one; server reads it)
  - `CLIENT_ORIGIN` set to your web app URL (for CORS/socket origin)

### Web settings

- Root directory: `apps/web`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Env vars:
  - `VITE_SERVER_URL` set to your deployed server URL (https)

### SPA routing rewrite

Add rewrite for static site:

- source: `/*`
- destination: `/index.html`

## Notes

- In-memory room state is used for simplicity and reliability in a single-instance deployment.
- Player reconnect is supported via stored player token.
- Duplicate submissions are blocked server-side.
- Player phones do not show leaderboard; display screen shows rankings and final podium.
