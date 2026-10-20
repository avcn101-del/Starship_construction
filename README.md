# Duct Tape Navy: Mostly in One Piece

A single-player ship builder and battle game for Android phones (installable
as a web app). You are a privateer captain who fights for the underdogs and
fights dirty. Build a ship from rooms, prepare it, and win fights you should
lose. Guns recoil, heat must be radiated, scans give you away, reactors fail
safe, and your crew's deaths are permanent.

**Status: design only.** Nothing is built yet. The first work is Mission 0:
proving the physics and balance bottom-up, in text, before any graphics.

## Documents

| File | What it is |
|---|---|
| `DESIGN.md` | The current design (source of truth) |
| `DECISIONS.md` | The dated log of every decision and why |
| `CLAUDE.md` | Working rules for every session in this repository |
| `IDEAS.md` | Ideas not built yet, and the gates they must pass |
| `MISSION0.md` | The Mission 0 results ledger (empty) |
| `CHANGELOG.md` | Versions |

## Running

Nothing to run yet. When Mission 0 starts, its scenarios will run headless
with Node (`node tools/...`); the game itself will be served as static files
(`python3 -m http.server`) and hosted on Cloudflare Pages.

## Tweakable values

None yet. Once `data.js` exists, this section lists its tunable constants
and their approved ranges and is kept in sync with it.

## Lineage

The lessons of the previous project, `avcn101-del/bridge-sim`, are in its
`HANDOFF.md`.
