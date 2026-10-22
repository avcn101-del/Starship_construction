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
- **Changing a law, an exit criterion or the direction needs the owner.**
  Technical decisions (scenarios, criteria, constants, ranges, models,
  architecture, process) are the **lead designer's**, recorded as *LD* rows
  in `DECISIONS.md` (#180). Any other session proposes; it does not decide.
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
  is text only: a Node command-line runner and data. One exception (#217):
  after L3 merges, a **rough, throwaway feel prototype** in `proto/`, which
  only reads the kernel, adds no number outside `js/data.js` and never
  counts as a Mission 0 result.
- Levels L0–L6 are built bottom-up; a level runs only on levels that
  passed.
- Every scenario follows the spec in `DESIGN.md` §13 and prints expected
  (formula) vs actual and PASS/FAIL.
- **Criteria are locked before running.** Never change a locked criterion
  or an expected formula to make a scenario pass. A run before the lock is
  for crashes and setup errors only; every edit made after it is listed
  in the pull request with its reason; a hand-worked literal is derived
  from the formula, never from a printed value; the blind physics checker
  is mandatory on kernel physics (#273).
- Tune constants with **run-time overrides**, never by editing files. Only
  the integrator writes `data.js` and the results ledger.
- **A conclusion without a re-runnable command does not count.**
- Tune each constant at the lowest level where it acts.

## Agents

- Agents may run, re-run, report, tune constants within approved ranges,
  flag anomalies and hunt exploits on their own.
- The lead designer decides new criteria, ranges and constants outside
  them, and records them; the owner decides direction and changes to a law
  (#180). No other session writes `DECISIONS.md`.
- Never delegated: judging the feel of play, playtests on the owner's
  Android phone, design decisions when a law fails.
- A verifier receives only the command line and the criterion, never the
  runner's conclusion.
- A multi-agent wave runs only with the lead designer's go-ahead, keeping
  the owner's spending guideline in mind (#191).

## Roles

- **No AI checks its own work.** Five roles, each its own session, defined
  in `.claude/agents/`: lead designer, engineer, reviewer, physics checker,
  and the owner's design partner, who decides nothing and writes only
  `IDEAS.md` (`DESIGN.md` §13b, #247). Work is handed over through pull requests.
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
  Mission 0 level or pass**; the lead designer merges once the reviewer
  (always) and the physics checker (whenever kernel physics changes, #241)
  report no blocking finding (#180). Documentation goes to `main` in **one
  pull request per working block** from the lead designer's branch (#218).
- **Plan gate** (#241): a plan commits its estimate script
  (`tools/estimates/<pass>.mjs`, run-time overrides only) and ends with the
  checklist (every passed rule on, tolerances against the integrator's
  error and float resolution, hardware sense-checked, numbers recomputed
  from the kernel). An estimate is never a canonical run: `node tools/m0.js
  run <id>` without `--set` re-records.
- **Sessions** (#241, #250): created with the model named explicitly, the
  whole task in the first message, the fetch refspec, the reading order and
  the file it may write; no sub-agents unless the task says so; cost
  estimates carry a ×2.5 factor (×4 for a kind of work not done before,
  #246). A session's last act is to **notify the lead designer**: a one-shot
  trigger into the lead designer's chat (`create_trigger` with
  `persistent_session_id` from `STATUS.md`'s header, one minute ahead)
  naming what it pushed; timed check-ins are the fallback. Independent read-only **audits** at the milestones of
  `DESIGN.md` §13b (#238), by `.claude/agents/auditor.md`.
- **Documents** (#241, #246): `DESIGN.md` is the current design with a
  table of the decisions in force (§18, one row per decision, updated with
  every new row); plans and measured history live in `HISTORY.md`;
  sessions and costs in `LEDGER.md`; `README.md` keeps no copy of the
  constants table. `node tools/lint-docs.mjs` passes before every
  documentation pull request; a decision row that supersedes another
  names it ("supersedes #n"); `tools/mutate.js` runs once per pass.
- **`STATUS.md`** is the hand-over: read it first; update it at the end of
  every working block (open PRs, pending approvals, running sessions,
  scheduled tasks, next steps).
- Commit messages: a short imperative subject; the body explains why.
- Docs and code are in English. Discussion with the owner is in Vietnamese
  mixed with English.
