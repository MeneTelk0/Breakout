# NOCTURNE — Break the blackout

A cinematic browser Breakout in a snow-covered city at midnight. Built from the original Breakout project, with a new interface, renderer, physics, progression, and leaderboard.

## Play

```sh
# macOS: PostgreSQL and Python 3.9–3.12 are required.
brew install postgresql@16
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
bash run.sh
```

Open **http://localhost:8000** on this computer. On another device on the same local network, open **http://<this-computer-IP>:8000**. The server listens on all IPv4 interfaces. The computer's current LAN address is `10.199.30.111`; it can change when the network changes.

The launcher creates a separate PostgreSQL cluster in the temporary directory, the `mitla` database, and the `rating` table from the original `tutorial_postgres.pdf`. It reuses the database on subsequent launches. Port 5432 must be available on the first launch. Python 3.13+ cannot run this legacy CGI server. Existing scores are preserved.

The game also runs from an ordinary static HTTP server; when the PostgreSQL/CGI leaderboard is unavailable, records are saved in the browser instead. Opening the HTML directly as a `file://` URL is not supported because the client uses JavaScript modules.

## Controls

- Mouse, touch, left/right arrows or A/D: move the paddle.
- Space or a tap/click on the field: launch the ball.
- Space or the charged button: activate eight seconds of Overdrive.
- P or Escape: pause. Leaving the tab pauses the game automatically.
- Speaker button: sound on/off. Next-track button: skip music.
- Fullscreen button: fill the screen, where supported by the browser.

Audio starts after a user action. Gameplay rotates through four original tracks, advances on level changes and at the end of each track, and never repeats the same song consecutively. Menu music remains separate.

## The night

Six distinct districts: Sleeping Quarter, Last Express, Neon Rift, Heart of the City, Ice Citadel, and Night Reactor. Three lives, progressive speed, armoured ice, explosive reactors, prism blocks, combos up to ×8, and a charged Overdrive attack.

Five pickups: multiball, a wider paddle, piercing plasma, slow motion, and a one-use shield. Reactor explosions damage nearby blocks and can cause chain reactions.

The renderer uses layered snow, glowing glass blocks, rotating shards, sparks, shockwaves, ball trails, light bursts, screen shake, hit pauses, and animated overlays. It honours reduced-motion preferences. Physics runs at a fixed 120 Hz and rendering uses `requestAnimationFrame` with capped pixel density and particle counts.

## Source

- `index.html`, `src/style.css`: responsive interface, help, pause, results, leaderboard.
- `src/game.mjs`: physics, levels, progression, pickups, scoring.
- `src/renderer.js`: Canvas 2D rendering and effects.
- `src/audio.js`: soundtrack playlist and synthesized positional effects.
- `src/main.js`: input, UI state, animation loop, persistence.
- `cgi-bin/scores.py`: validated JSON leaderboard backed by the original PostgreSQL table.
- `assets/nocturne-city.png`: generated city panorama; generation brief in `assets/README.md`.
- `game_script.html`: compatibility redirect for the old game URL.

The original images, audio, PDF instructions, and CGI pages are retained.

## Checks

```sh
npm test
# With bash run.sh already running:
.venv/bin/python tests/api-smoke.py
```

The tests cover collision at high speed, reactor chains, armour, paddle rebound, pause, multiball, lives, Game Over, Overdrive, pickups, all six level transitions, playlist rotation, API validation, and Cyrillic names. The API test removes only the record it creates.

Original project: [MeneTelk0/Breakout](https://github.com/MeneTelk0/Breakout). Original collaborator: [vovaf709](https://github.com/vovaf709).
