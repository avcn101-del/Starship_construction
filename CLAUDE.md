# CLAUDE.md — Project rules for Duct Tape Navy

*Duct Tape Navy: Mostly in One Piece* is a single-player, phone-first ship
builder and battle game. The player is a privateer captain: they build a
ship from rooms, set its standing orders and, in battle, scan zones, target
rooms and switch presets. Physics is borrowed from reality; crew deaths are
permanent.

These rules apply to every session working in this repository. The design
is in `DESIGN.md`; why each decision was made is in `DECISIONS.md`.

## Source of truth

- `DESIGN.md` is the current design. `DECISIONS.md` is the dated,
  append-only log. A new decision is appended to `DECISIONS.md` **and**
  reflected in `DESIGN.md` in the same commit.
- **Changing a law, a criterion or a decided rule needs the owner.** Propose
  it; do not do it.
- A new idea goes to `IDEAS.md` first. It is built only after it passes the
  four gates (`DESIGN.md` §2) and the coverage table (§8). An idea that
  passes no gate is not built.

## Tech constraints (hard rules)

- Plain HTML, CSS and JavaScript **ES modules**. No frameworks, no
  TypeScript, no npm, no `package.json`, no bundler, no build step.
- Hosted on Cloudflare Pages as static files; local development uses a
  static server (`python3 -m http.server`), not `file://`.
- The **simulation kernel never touches the DOM**: it must run in Node with
  `import` and nothing else.
- **No `Math.random` in the simulation.** Use the seeded RNG from
  `util.js`; visual effects use their own separate stream.
- No external dependencies except Google Fonts with a system fallback.
- All player-facing text is in **English**, in one place in `data.js`.
- Do not add linters, test frameworks or other tooling unless the owner
  asks. Node's built-in modules (`fs`, `vm`, `worker_threads`, ...) are
  allowed in `tools/`. Playwright is available at
  `NODE_PATH=/opt/node-tools/node_modules` for the smoke test after
  Mission 0.

## Architecture rules

- **Data-driven.** Every number that affects the game lives in `data.js`.
  Every attribute follows the schema in `DESIGN.md` §5.1. Every tunable
  constant carries an approved `min`–`max` and, where it scales with the
  tier, a scaling exponent. **No hidden stat multipliers.**
- **One responsibility per file**, as listed in `DESIGN.md` §14.
- **Knowledge, not truth.** The renderer and the enemy read only their own
  knowledge model, never the other side's true layout or orders.
- **Events, not direct calls, for presentation.** The kernel emits events;
  presentation and audio subscribe. Every damage event carries the id of
  its cause; events carry what sound needs (energy, distance, damage
  channel, room, crew aboard).
- **Deterministic.** The same seed and the same player inputs give the
  same battle, so any result can be re-run and replayed.
- **Every effect has a physical cause** in the simulation. Nothing absurd.

## Mission 0 discipline

- **No rendering code until Mission 0 exits** (`DESIGN.md` §13). Mission 0
  is text only: a Node command-line runner and data.
- Levels L0–L6 are built bottom-up; a level runs only on levels that
  passed.
- Every scenario follows the spec in `DESIGN.md` §13 and prints expected
  (formula) vs actual and PASS/FAIL.
- **Criteria are locked before running.** Never change a locked criterion
  or an expected formula to make a scenario pass.
- Tune constants with **run-time overrides**, never by editing files. Only
  the integrator writes `data.js` and the results ledger.
- **A conclusion without a re-runnable command does not count.**
- Tune each constant at the lowest level where it acts.

## Agents

- Agents may run, re-run, report, tune constants within approved ranges,
  flag anomalies and hunt exploits on their own.
- The owner decides new criteria, constants outside the approved ranges,
  changes to a law, and anything that touches `DECISIONS.md`.
- Never delegated: judging the feel of play, playtests on the owner's
  Android phone, design decisions when a law fails.
- A verifier receives only the command line and the criterion, never the
  runner's conclusion.
- A multi-agent wave runs only with the owner's explicit go-ahead, with a
  cap on the number of agents.

## Roles

- **No AI checks its own work.** Four roles, each its own session, defined
  in `.claude/agents/`: lead designer, engineer, reviewer, physics checker
  (`DESIGN.md` §13b). Work is handed over through pull requests.
- Give a reviewer the pull request and the documents, never your own
  summary or conclusions.
- An engineer never changes the design: questions go in the pull request.

## Workflow rules

- When a feature changes, update `DESIGN.md` (and `DECISIONS.md` for a
  decision) and `CHANGELOG.md` in the same commit.
- **Before finishing any task**: run every Mission 0 scenario that has
  passed so far and report the result honestly, failures included. After
  Mission 0, also run the smoke test on a phone viewport and confirm zero
  console errors (a blocked Google Fonts request in the sandbox is not a
  game error).
- Git: `main` is the default branch; **one branch and one pull request per
  Mission 0 level**; the owner reviews and merges.
- Commit messages: a short imperative subject; the body explains why.
- Docs and code are in English. Discussion with the owner is in Vietnamese
  mixed with English.
