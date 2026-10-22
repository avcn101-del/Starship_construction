# Duct Tape Navy: Mostly in One Piece

A single-player ship builder and battle game for Android phones (installable
as a web app). You are a privateer captain who fights for the underdogs and
fights dirty. Build a ship from rooms, prepare it, and win fights you should
lose. Guns recoil, heat must be radiated, scans give you away, reactors fail
safe, and your crew's deaths are permanent.

**Status: Mission 0, levels L0 (materials) and L1 (one room alone) done: 27 scenarios verified, 1 withdrawn for a specification error and replaced. L2 (pairs and clusters) in review: 19 scenarios locked and run; 15 PASS and 4 withdrawn (two for specification errors, two superseded by the coolant-loop heat model of #200), each replaced by a passing successor (pull request `m0/l2-clusters`).** No game yet. Mission 0
proves the physics and balance bottom-up, in text, before any graphics.

## Documents

| File | What it is |
|---|---|
| `DESIGN.md` | The current design (source of truth) |
| `DECISIONS.md` | The dated log of every decision and why |
| `HISTORY.md` | The plans and measured results of each Mission 0 pass (moved from `DESIGN.md`) |
| `CONSTANTS.md` | Every constant, value and range, generated from `js/data.js` |
| `CLAUDE.md` | Working rules for every session in this repository |
| `IDEAS.md` | Ideas not built yet, and the gates they must pass |
| `MISSION0.md` | The Mission 0 results ledger |
| `STATUS.md` | The hand-over between sessions: open pull requests, next steps |
| `LEDGER.md` | Sessions and costs, per level |
| `CHANGELOG.md` | Versions |

## Running

Mission 0 runs headless with Node 22 (no npm):

```
node tools/m0.js list          # scenarios, lock hashes, last verdicts
node tools/m0.js run L1        # run a level (canonical runs are recorded)
node tools/m0.js verify L1     # independent re-run against the records
node tools/m0.js regress       # re-run every recorded PASS
node tools/m0.js ledger        # regenerate MISSION0.md
```

The game itself will be served as static files (`python3 -m http.server`)
and hosted on Cloudflare Pages.

## Tweakable values

Every constant, with its value, unit, approved range and scaling exponent k, is in `CONSTANTS.md`, generated from `js/data.js` (`node tools/constants.mjs`). It is the only table of values and ranges (`DESIGN.md` §5.1); this README keeps no copy.

## Lineage

The lessons of the previous project, `avcn101-del/bridge-sim`, are in its
`HANDOFF.md`.
