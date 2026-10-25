// proto/phases.js — the phases feel prototype's battle (DESIGN.md 13n.12; #365, #366, #367), no DOM. Both sides are
// flown by js/enemy.js at the standard personality; the phases are emulated between the kernel's ticks, as the contact
// probe did (IDEAS.md, battle phases), by writing only the side's state the kernel reads: a menu entry's slots into
// helm.override (over the captain's own override), and the captain's patience for contact's hold (#367 (1)).
//
// Contact: every side starts on Stand off with its patience at the kernel's zone count, so js/enemy.js holds its
// weapons until its model resolves every zone of the other. It ends, each side from its own model and log, when every
// zone is resolved, when it has no antenna standing, or when its own ship takes a cell-damaged event (#346 (4)); at an
// exit the zones do not cover its patience goes to 0, so the kernel's own step releases the hold. A side that picks
// another entry from the menu during contact leaves contact too (weapons free).
// Decision point 1 at contact's exit: any entry; auto the build's first position entry. Decision point 2 (a reversal)
// at the first cell-damaged event of its own ship after it took an attack entry (role position or finish): stay,
// Stand off or Break off; auto stay. The enemy takes the auto choices at once; the player too unless the pause setting
// is on, when the battle waits for the choice (no timer).
// Every player choice is recorded with its step ({ step, entry }); the verbs scan and target enter the kernel's inputs
// as before. A battle replays from its setup, choices and verbs (proto/replay.mjs). Adds no number: every threshold is
// the kernel's or js/data.js's. Never a Mission 0 result (#217).
import { withOverrides, scaled, TIERS, PARAMS, MENUS } from '../js/data.js';
import { createBattle, tick } from '../js/battle.js';
import { antennas } from '../js/sensors.js';
import { BUILDS } from '../mission0/builds.js';

/** The builds a pair is chosen from (the locked reference builds, mission0/builds.js). */
export const PAIR_BUILDS = ['R2', 'Lance', 'Swarm', 'Furnace'];
/** The opening distances on offer: js/data.js helm values (#366). */
export const OPENINGS = ['rangeHold', 'rangeOpen'];
export const ASPECTS = ['bow', 'broadside'];
/** The standard personality (#111, #333), on both sides. */
export const STANDARD = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };
const EDGE = TIERS.T1.edge;

/** A build's menu: the common entries, then its own (js/data.js MENUS). */
export const menuOf = (build) => [...MENUS.common, ...MENUS[build]];
export const entryOf = (build, id) => menuOf(build).find((e) => e.id === id) || null;
/** The auto choice at decision point 1: the build's first position entry. */
export const autoFirst = (build) => MENUS[build].find((e) => e.role === 'position').id;
/** The opening distance (m) of an opening key. */
export const openingDistance = (opening) => scaled(PARAMS.helm[opening], EDGE);
/** The run-time overrides of a setup: battle.cullDistance at twice the opening when that is above its default (#318). */
export function overridesOf(opening) {
  const d = openingDistance(opening); // T1: the cell edge is js/data.js's base edge, so a value at T1 is the constant's value
  return 2 * d > scaled(PARAMS.battle.cullDistance, EDGE) ? { 'battle.cullDistance': 2 * d } : {};
}

/** A side's phase state. */
function phaseSide(side, build) {
  return { name: side.name, build, entry: 'standOff', contact: true, exit: null, attackSince: null, dmgIndex: 0, pending: null, history: [] };
}

/**
 * A new phases battle: { player, enemy } builds, opening ('rangeHold' | 'rangeOpen'), aspect ('bow' | 'broadside'),
 * seed, pause (the setting). The battle object is the kernel's, with `phases` added.
 */
export function createPhases({ player, enemy, opening = 'rangeOpen', aspect = 'bow', seed = 1, pause = false }) {
  for (const b of [player, enemy]) if (!PAIR_BUILDS.includes(b)) throw new Error(`unknown build ${b}`);
  if (!OPENINGS.includes(opening)) throw new Error(`unknown opening ${opening}`);
  if (!ASPECTS.includes(aspect)) throw new Error(`unknown aspect ${aspect}`);
  const overrides = overridesOf(opening), bs = aspect === 'broadside';
  const b = createBattle({
    params: withOverrides(overrides), attacker: BUILDS[player], target: BUILDS[enemy], distance: openingDistance(opening), seed,
    knowledge: true, bearing: bs ? '+y' : '+x', ...(bs ? { attackerHeading: 0 } : {}), enemy: { A: STANDARD, T: STANDARD },
  });
  b.phases = {
    setup: { player, enemy, opening, aspect, seed, pause }, overrides, choices: [],
    A: phaseSide(b.attacker, player), T: phaseSide(b.target, enemy),
  };
  for (const s of b.sides) {
    s.baseOverride = { ...s.helm.override }; // the captain's own slots (its personality); an entry goes over them
    s.enemy.patience = s.model.zones.length; // contact's hold (#367 (1))
    apply(b, s, 'standOff', 'start');
  }
  return b;
}

const sideOf = (b, name) => (name === 'A' ? b.attacker : b.target);
/** Whether a side has an antenna standing (not ruined, its cell not destroyed). */
export const antennaStanding = (side) => antennas(side.world).some((f) => !f.ruined && !side.room(f.room).cells[f.k].destroyed);

/** Write an entry's slots into the side's helm.override (over the captain's own) and record it on the side. */
function apply(b, s, id, why) {
  const p = b.phases[s.name], e = entryOf(p.build, id);
  if (!e) throw new Error(`${id} is not on ${p.build}'s menu`);
  s.helm.override = { ...s.baseOverride, ...e.slots };
  if (p.contact && id !== 'standOff') leaveContact(b, s, 'choice');
  if (e.role && p.entry !== id) p.attackSince = b.step; // a new attack entry: a reversal may come (staying re-arms none)
  if (!e.role) p.attackSince = null;
  p.entry = id;
  p.history.push({ step: b.step, t: b.t, entry: id, why });
}
/** Contact's end for a side: at an exit the zones do not cover, patience 0 so the kernel releases the hold. */
function leaveContact(b, s, why) {
  const p = b.phases[s.name];
  p.contact = false;
  p.exit = { step: b.step, t: b.t, why };
  if (why !== 'zones') s.enemy.patience = 0;
}

/**
 * A choice of the player's (side A): an entry id of its menu. It resolves a pending decision point (recording which),
 * or is a free change from the menu. Recorded with its step; applied now, before the next tick.
 */
export function choose(b, id, side = 'A') {
  if (b.ended) return null;
  const s = sideOf(b, side), p = b.phases[side], dp = p.pending ? p.pending.dp : 0;
  if (dp === 2 && !['stay', 'standOff', 'breakOff'].includes(id) && id !== p.entry) throw new Error(`decision point 2 offers stay, Stand off or Break off, not ${id}`);
  const entry = id === 'stay' ? p.entry : id;
  p.pending = null;
  if (side === 'A') b.phases.choices.push({ step: b.step, entry: id });
  apply(b, s, entry, dp ? `decision ${dp}` : 'menu');
  return { step: b.step, entry: id, dp };
}
/** Whether the battle waits for the player (the pause setting with a decision point pending). */
export const waiting = (b) => !!(b.phases.setup.pause && b.phases.A.pending);

/** After each tick: each side's exits and reversals from its own model and log; the auto choices. */
export function afterTick(b) {
  for (const s of b.sides) {
    const p = b.phases[s.name], ev = s.world.log.events;
    let damaged = false;
    for (; p.dmgIndex < ev.length; p.dmgIndex++) if (ev[p.dmgIndex].type === 'cell-damaged') damaged = true;
    if (s.ended || b.ended || p.pending) continue;
    if (p.contact) {
      const why = s.model.resolved.size >= s.model.zones.length ? 'zones' : !antennaStanding(s) ? 'antenna' : damaged ? 'damage' : null;
      if (why) { leaveContact(b, s, why); decide(b, s, 1); }
    } else if (damaged && p.attackSince !== null && entryOf(p.build, p.entry).role) {
      p.attackSince = null; // one reversal per attack entry taken
      decide(b, s, 2);
    }
  }
}
/** A decision point for a side: the enemy (and the player without the pause setting) takes the auto choice at once. */
function decide(b, s, dp) {
  const p = b.phases[s.name], auto = dp === 1 ? autoFirst(p.build) : 'stay';
  p.pending = { dp, step: b.step, t: b.t, auto, options: dp === 1 ? menuOf(p.build).map((e) => e.id) : ['stay', 'standOff', 'breakOff'] };
  (p.points ??= []).push({ dp, step: b.step, t: b.t });
  if (s.name === 'T' || !b.phases.setup.pause) {
    const id = auto === 'stay' ? p.entry : auto;
    p.pending = null;
    apply(b, s, id, `auto ${dp}`);
    p.lastAuto = { dp, entry: auto, step: b.step, t: b.t };
  }
}

/** One step: the kernel's tick, then the phases. */
export function stepPhases(b) {
  tick(b);
  afterTick(b);
}

/** The phase a side is in (its own: the page shows it for the player). */
export function phaseOf(b, name) {
  const p = b.phases[name], e = entryOf(p.build, p.entry);
  if (p.pending) return `decision ${p.pending.dp}`;
  if (p.contact) return 'contact';
  if (p.entry === 'standOff') return 'stand-off';
  if (p.entry === 'breakOff') return 'break-off';
  return e.role;
}

/**
 * Replay a phases battle from its setup, choices and verbs to `step` (or its end): the choices applied at their step
 * before that step's tick, the verbs as the kernel's inputs, exactly as the page played them.
 */
export function replayPhases({ setup, choices = [], inputs = [], step = Infinity }) {
  const b = createPhases(setup);
  b.inputs.push(...inputs.map((x) => ({ ...x, side: 'A', step: x.step, done: false })));
  let k = 0;
  for (;;) {
    while (k < choices.length && choices[k].step === b.step) choose(b, choices[k++].entry);
    if (b.ended || b.step >= step) break;
    if (waiting(b)) throw new Error(`replay: the player's decision at step ${b.step} is not in the choices`);
    stepPhases(b);
  }
  return b;
}
