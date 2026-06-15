# AGENTS.md

## Current state

- Working directory: `C:\Users\milu\Desktop\code\game`
- Main file: `index.html` (single-file Three.js FPS game, ~2923 lines)
- Git repo initialized (remote: `https://github.com/miluchens-commits/game3.git`, branch `main`)

## Game overview

Single-file browser FPS with:
- Three.js rendering (loaded via CDN)
- Ranked mode (localStorage `oc_rank`), 20-tier ladder
- 5 maps: base, rain, fog, dragonboat (with E-key boat riding)
- 5 enemy types: normal, rusher, grenadier, suicider, healer
- Item drops: health pack, attack speed buff, infinite ammo
- Level/XP system (localStorage `oc_level`), XP earned per game
- Weapon loadout system (AK-47, Deagle, AWP, knife, grapple gun)

## Key conventions

- Everything in one `<script>` block — syntax error breaks whole file
- Assets defined in JS (no external models)
- Data persisted via `localStorage`
- Audio via Web Audio API (no audio files)
- Chinese UI text
- No comments in code

## Level/XP system

- `playerXP` var (initialized from localStorage `oc_level`)
- Level formula: `xpForLevel(l) = l * 100` (level 1: 0XP, level 2: 100XP, level 3: 300XP...)
- `getLevel(xp)` / `getLevelInfo(xp)` functions
- `updateLevelDisplay()` updates menu level frame + settlement popup
- `addXP(amt)` adds XP, persists, updates display
- XP earned: 10 + (roundNum - 1) * 2 per game
- Settlement popup shown on "回選單" click (before menu)
- Level frame in menu top-right: enemy silhouette + metal border + level number

## Related localStorage keys

- `oc_level` — player XP
- `oc_rank` — rank data (tier, points, streak, games, match stats)
- `ocgame_save` — game save state
- `oc_coin` — coins
- `oc_inv` — weapon inventory
- `oc_loadout` — equipped loadout
- `oc_armory_fl` — flashlight bindings
- `oc_purchased` — purchased items
- `oc_event_kills` — event quest progress

## Testing

Open `index.html` in browser via HTTP server (python3 -m http.server 8080). No test framework.
