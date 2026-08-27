# AGENTS.md

## Repository Structure

- **Browser game**: `index.html` — single-file Three.js FPS (~2900 lines), all JS in one `<script>` block
- **Multiplayer server**: `server.js` — Express + WebSocket + PostgreSQL auth server
- **Unity project**: `LostFacility/` — separate Unity FPS project (Godot config at root is unrelated)
- **Desktop wrapper**: `ocgame-desktop/` — Electron packaging for Windows

## Quick Start

```bash
# Browser game (client-only)
python3 -m http.server 8080
# Open http://localhost:8080

# Multiplayer server
npm install
JWT_SECRET=your_secret DATABASE_URL=postgres://... node server.js
```

## Key Constraints

- `index.html` is a single monolithic file — syntax errors break the entire game
- All game data persisted via `localStorage` (keys prefixed `oc_`)
- No external assets/models — everything is procedurally generated in JS
- Chinese UI text throughout
- Audio uses Web Audio API, no audio files loaded
- Godot `project.godot` at root is for a separate "ParkourShooter" project, not the main game

## localStorage Keys

| Key | Purpose |
|-----|---------|
| `oc_level` | Player XP |
| `oc_rank` | Rank data (tier, points, streak, games) |
| `ocgame_save` | Game save state |
| `oc_coin` | Coins |
| `oc_inv` | Weapon inventory |
| `oc_loadout` | Equipped loadout |
| `oc_armory_fl` | Flashlight bindings |
| `oc_purchased` | Purchased items |
| `oc_event_kills` | Event quest progress |

## Server Environment Variables

- `JWT_SECRET` — JWT signing key (defaults to `ocgame_dev_secret`)
- `DATABASE_URL` — PostgreSQL connection string (optional; runs without DB)
- `GOOGLE_CLIENT_ID` — Google OAuth client ID (optional)

## No Test Framework

Testing is manual: open `index.html` in browser via HTTP server.
