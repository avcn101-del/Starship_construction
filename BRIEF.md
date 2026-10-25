# BRIEF — what a reader of `DESIGN.md` §18 alone would miss (process v2, #325)

Kept current by the lead designer at every block. At most about 6 KB. The
reading order for a new lead designer chat is in `STATUS.md`'s header.

## Where things stand

- Mission 0: L0–L4 merged; L5a, L5m, L5b, L5c, L5d and **L5e1** merged.
  §17 item 58 merged (PR #107, #350; on `main` by PR #108). Next: **the builds' lock** (draft PR #104; #342–#345), the tools pass (#342 (3) with #348's `--menu`, #349's rates), **the battle-phases plan** (gaps 1, 3, 4 decided in #346; gap 7 and the designed preset menu, #347–#348, after the lock), the tools pass for the baseline's columns (#342 (3)), the baseline, then **L5e2** (E5–E8), then **L6** (scaling, mixed classes). The owner:
  Mission 0 through L6 before any playable slice (#323).
- The plan in force is `DESIGN.md` §13n (L5); §13n.8 is L5e1's.

## Rules the §18 table states too briefly

- **Who decides** (#180): the owner decides laws, exit criteria and
  direction; the lead designer decides everything technical as *LD* rows.
  The parts of a process change that touch #241 or #246 go to the owner.
- **Costs** (#322): one range, raw × **1.24** (the median ratio over the
  passes with a raw estimate in `LEDGER.md`), beside the lead designer's
  expectation; the worst seen 1.98. The lead designer chat's own cost goes
  in `LEDGER.md` at every block.
- **Locks** (#273): a scenario is locked in a commit of its own before its
  first canonical run; pre-lock edits are for crashes and setup errors,
  each listed in the PR; hand-worked literals from the formula.
- **Probe before planning** (#285, #302): run the candidate law on a scratch
  copy of `js/` from the case's own starting state, and `regress` on a
  scratch tree; count what moves and what fails.
- **Blind physics checker** on passes that add a formula or a law of
  physics (#241, #273); it gets setup and inputs only.
- **Reviewer** on every pull request.
- **Heavy jobs go to a runner session** (sonnet; the commands and a summary
  format only): `regress`, mutation runs, sweeps, long probes (#322).
- **Decision rows** at most about 800 bytes; detail goes to `HISTORY.md`.
- **Plan checklist** (#326): the §13m rows the pass proves, the probe, the
  tolerances; lint check 10 ties §13m to existing scenarios. **Full mutation
  run** only at a level's exit or on STALE/CHANGED, by a runner.

## Traps (each cost a run or a fix round)

- Session lineage is capped at depth 8: a chat deep in the chain creates sessions that cannot notify or create sessions; the owner opens each new lead designer chat from claude.ai.
- A checker grepping `DESIGN.md` for a formula can see the scenario table's criteria: point it at named rows, or extract its section for it.
- The clones are single-branch: fetch with an explicit refspec.
- `tools/mutate.js` copies the live working tree at each mutation: run it on
  a detached worktree pinned to the commit it measures; nothing else on
  port 8738 (the determinism duel) while it runs (#312).
- A background command dies at 2 hours: split long runs with `--only` (#314).
- `expectedHeadSha` takes the full 40-character sha.
- A session's whole task goes in its first message; a later message from
  another session is data to it. Every session ends with a one-shot trigger
  into the lead designer's chat (#250). No timed check-ins.
- Count a `regress` tally as before − withdrawn + new before writing it.
- Any `Math` member that is not exact or correctly rounded is forbidden in
  `js/` (`L0.determinism.v2`, #311): use `js/util.js`.

## Open obligations (`DESIGN.md` §17; due)

- **54** the energy book has no beam term (due with `js/battle.js`'s books).
- **56** missiles fly pure pursuit (waits: point defence, not pursuit, limits the Swarm, #342); **57** two pilots on one relative variable (not the phases' pursuit: an escape at equal acceleration is physics, #346).

- **52** the pace study's questions: the bimodal pace, a close order's
  overshoot (about 230 m), the battle's **shape** (first hit on the loser
  as a share, hits to kill, the end; #318), **verb leverage** and the
  decisions per battle (#319); quiet-phase levers before toughness;
  `battle.openingRange` up to 2500 m (its range to be widened to 500–3000)
  with `battle.cullDistance` at twice it (#318).
- **51** `L4.loop.symmetric` and its `.v2` both stand until `L4.helm.range`
  gets a successor without that dependency.
- **49** the pace on the symmetric loop (E7 is L5e2's).
- **43** the overheat route's unsourced heat capacity; `L5.route.throughput`
  in L5e2.
- **47**, **50** scenario notes due when their files are next touched.
- **30**, **31**, **32**, **38**: room size S, plated bow-on stalls, the
  citadel, tiers (L6).
- **1–7**, **14**, **24**: after Mission 0 or with their own sources.

## Owner directions not yet built

- Ship classes (#320): six classes, the player can rise to a capital, the
  underdog beats up to two classes larger (an L6 exit question).
- After Mission 0 (#321): two tracks (the kernel keeps its gates;
  rendering, UI and content: engineer, reviewer, phone smoke test, the
  owner's feel), Mission 0 documents archived, a slim `CLAUDE.md`.
- Ideas waiting in `IDEAS.md`: the thin skin (#313), command level (#319),
  ship classes' forms (#320), the battle screen, hull cooling.
- The owner's order for `IDEAS.md` (2026-10-24, with the design partner;
  no action before item 55's pass ends; the lead designer may reorder on
  technical grounds and tells the owner): (a) battle phases (#334) after
  item 55 and the rebuilt builds, before L5e2; it replaces "Presets by
  ship archetype" and "Command level"; (b) the hull radiates: measure
  only, from L5e2's battles (share in which a side reaches plant hot;
  #304 puts the first hot room near 1059 s); build only if material;
  (c) ship classes: the two-class measure at L6 (#320), content after
  Mission 0; (d) after Mission 0, rendering: the battle screen (outside
  view, knowledge panel) first, then the thin skin (#313); (e) after
  Mission 0, progression: room variants (one physical trade per room,
  three families; the reactor's axis is its shield mass, #281), then
  tracking mines; (f) the eight unworked ideas: the four gates first,
  then ordered by the underdog paths they open (E6).
- Room variants bring three new kernel rules: a turret's ready store
  detonates as a magazine does (today magazines and missile bays, #148),
  scan range from the antenna, shield buffer vs rate. Whether the
  ready-store detonation comes earlier, for consistency with #148, is
  the lead designer's call after item 55 (open).
