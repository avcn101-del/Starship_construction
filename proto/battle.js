// proto/battle.js — the page's battle (DESIGN.md 13n.1 (d), L5d; #217, #301
// (5)), no DOM: the kernel's own loop (js/battle.js createBattle / tick) on the
// duel of proto/duel.js (both ships R1d-A, the player A on Fire, the enemy T by
// js/enemy.js at 0.5 each). The player's three verbs enter only as the kernel's
// inputs { t, verb, arg } (side A), applied before the next step, so a played
// battle replays from its seed and inputs (tools/duel.js). This file adds no
// loop, no autopilot and no script of its own; it reads the kernel's state for
// the page (the player's own world, its knowledge model of the enemy, the
// battle's shot books) and adds no game number.
import { tick, battleTree, mainBody } from '../js/battle.js';
import { isDestroyed } from '../js/rooms.js';
import { createDuel } from './duel.js';

export { tick, mainBody };

/** A new battle for the page: the seed and the run-time overrides (checked by the page against their approved range). */
export function startBattle({ seed, overrides = {} }) {
  const b = createDuel({ seed, overrides });
  b.played = []; // the player's verbs as played: [{ t, verb, arg }] (the export's inputs)
  b.overrides = { ...overrides };
  b.crewTotal = Object.fromEntries(b.sides.map((s) => [s.name, s.world.rooms.reduce((x, r) => x + r.crew, 0)]));
  return b;
}

/**
 * A verb of the player's (13n.1 (d)): 'scan' a zone (0-5), 'target' a room id, 'preset' fire / cool / evade. It is
 * pushed to the kernel's inputs at this step, as tools/play.mjs does, so it applies before the next step and its t
 * (battle.t = step x dt) gives the same step on replay.
 */
export function playVerb(b, verb, arg) {
  if (b.ended) return null;
  const x = { t: b.t, verb, arg };
  b.played.push(x);
  b.inputs.push({ ...x, side: 'A', step: b.step, done: false });
  return x;
}

/** The side whose name is `name` ('A' the player, 'T' the enemy). */
export const sideOf = (b, name) => (name === 'A' ? b.attacker : b.target);
/** The shooter's side name of a battle shot id, from the kernel's one id space (battle.ids: side:cause -> id). */
function shooters(b) {
  const out = new Map();
  for (const [k, id] of b.ids) out.set(id, k.split(':')[0]);
  return out;
}
/** Shots, hits and misses per side (the shooter's), from the battle's books; rounds in flight per side. */
export function shotStats(b) {
  const by = shooters(b), z = () => ({ shots: 0, hits: 0, misses: 0, flying: 0 }), out = { A: z(), T: z() };
  for (const [id, s] of by) if (/^shot-/.test(id)) out[s].shots++;
  for (const h of b.hits) { const s = by.get(h.id); if (s) out[s].hits++; }
  for (const m of b.misses) { const s = by.get(m.id); if (s) out[s].misses++; }
  for (const r of b.rounds) if (!r.over && !r.done) out[r.shooter.name].flying++;
  return out;
}
/** Crew lost and rooms wrecked of a side's own ship. */
export function losses(b, name) {
  const s = sideOf(b, name), lost = s.world.log.events.filter((e) => e.type === 'crew-died').reduce((x, e) => x + e.deaths, 0);
  return { crewLost: lost, crewTotal: b.crewTotal[name], wrecked: s.world.rooms.filter((r) => isDestroyed(r)).map((r) => r.id) };
}

/**
 * The cascade tree of why a side's battle ended (#41, #264), from the kernel's tree of its log (battleTree): the
 * root of the event that caused the end, then each event it caused with its depth. Shown only after the end (the
 * debrief), never during the battle.
 */
export function endTree(b, name) {
  const s = sideOf(b, name);
  if (!s.ended) return null;
  const ev = s.world.log.events, byId = new Map(ev.map((e) => [e.id, e]));
  let root = s.ended.parent;
  while (byId.has(root)) root = byId.get(root).parent;
  const tree = battleTree(b).find((x) => x.side === name).tree, r = tree.roots.find((x) => x.root === root), rows = [];
  const walk = (n, d) => { rows.push({ depth: d, event: n.event }); for (const c of n.children) walk(c, d + 1); };
  if (r) for (const c of r.children) walk(c, 1);
  return { root, parent: s.ended.parent, end: s.ended, rows };
}
