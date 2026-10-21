// proto/export.js — the feel prototype's export (DESIGN.md 13h, 13j, #217,
// #224, #237): one compact JSON text of a battle (version, seed, loadout with
// the player's standing orders, the player's inputs by step, the end, the
// event hash and a short per-room summary), so
// that proto/replay.mjs can rebuild the battle headless from seed, loadout
// and inputs and check it ends the same. No DOM: the page (proto/proto.js)
// and Node (proto/replay.mjs) both use it. The full event list is not
// exported; the replay prints it.
import { isDestroyed } from '../js/rooms.js';
import { summary } from './battle.js';
import { PROTO_VERSION, PRESETS } from './config.js';

/**
 * A recorder of one battle: a running hash of every event (cyrb53-style, two 32-bit lanes, over each event's JSON
 * and a newline, in the order the battle emits them) and per room the first time it was hot, overheated and wrecked.
 * The same events in the same order give the same hash in the browser and in Node.
 */
export function createRecorder(battle) {
  return { battle, h1: 0xdeadbeef, h2: 0x41c6ce57, count: 0, rooms: { player: {}, enemy: {} } };
}

/** Fold a batch of events (drainEvents, after each tick) into the recorder. */
export function record(rec, events) {
  for (const e of events) {
    const s = JSON.stringify(e);
    let { h1, h2 } = rec;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    rec.h1 = Math.imul(h1 ^ 10, 2654435761); rec.h2 = Math.imul(h2 ^ 10, 1597334677);
    rec.count++;
    if (e.room === '-' || !(e.side in rec.rooms)) continue; // a miss names no room
    const r = rec.rooms[e.side][e.room] || (rec.rooms[e.side][e.room] = { hot: null, overheated: null, wrecked: null });
    if (e.type === 'hot' && r.hot === null) r.hot = e.t;
    if (e.type === 'overheated' && r.overheated === null) r.overheated = e.t;
    if ((e.type === 'cell-destroyed' || e.type === 'explosion') && r.wrecked === null && isDestroyed(rec.battle[e.side].room(e.room))) r.wrecked = e.t;
  }
}

/** The recorder's hash: 16 hex digits. */
export function eventHash(rec) {
  let h1 = rec.h1, h2 = rec.h2;
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

/** Where the battle stands: its end if it ended, else the step it was exported at; crew lost, rooms wrecked, shots, hits and misses per side. */
export function endOf(battle) {
  const e = battle.ended, side = (s) => { const x = summary(s); return { crewLost: x.crewLost, crewTotal: x.crewTotal, wrecked: x.wrecked, shots: x.shots, hits: x.hits, misses: x.misses }; };
  return {
    ended: !!e, steps: battle.steps, t: battle.t,
    losers: e ? e.losers : null, reason: e ? e.reason : null,
    sides: { player: side(battle.player), enemy: side(battle.enemy) },
  };
}

const round2 = (t) => (t === null ? null : Math.round(t * 100) / 100);

// Inputs are one string of space-separated tokens, in the order made: the step, then P and the preset's initial
// (f, c, e) or T and the room id (T- clears the target); an input of the enemy side starts with E. "5400Pc 5460TbeamBay"
// is Cool at step 5400, then target the beam bay at step 5460.
const INITIAL = Object.fromEntries(Object.keys(PRESETS).map((k) => [k, k[0]]));
const PRESET_OF = Object.fromEntries(Object.keys(PRESETS).map((k) => [k[0], k]));
if (Object.keys(PRESET_OF).length !== Object.keys(PRESETS).length) throw new Error('preset initials are not unique');
const token = (i) => `${i.side === 'player' ? '' : 'E'}${i.step}${i.kind === 'preset' ? `P${INITIAL[i.value]}` : `T${i.value === null ? '-' : i.value}`}`;
/** The inputs of an export, back as { step, kind, value, side }. */
export function decodeInputs(text) {
  return text.split(' ').filter(Boolean).map((tok) => {
    const m = /^(E?)(\d+)([PT])(.+)$/.exec(tok);
    if (!m) throw new Error(`bad input token ${tok}`);
    const side = m[1] ? 'enemy' : 'player', step = Number(m[2]);
    if (m[3] === 'P') { if (!PRESET_OF[m[4]]) throw new Error(`bad preset in ${tok}`); return { step, kind: 'preset', value: PRESET_OF[m[4]], side }; }
    return { step, kind: 'target', value: m[4] === '-' ? null : m[4], side };
  });
}

/**
 * The export of a battle. inputs: see decodeInputs; summary: per side, per room that got hot or worse, [first hot,
 * first overheated, wrecked] (s, to 0.01 s; null: never).
 */
export function buildExport(battle, rec) {
  const summaryOut = {};
  for (const side of ['player', 'enemy']) {
    summaryOut[side] = {};
    for (const [id, r] of Object.entries(rec.rooms[side])) if (r.hot !== null || r.overheated !== null || r.wrecked !== null) summaryOut[side][id] = [round2(r.hot), round2(r.overheated), round2(r.wrecked)];
  }
  return {
    v: PROTO_VERSION, seed: battle.seed, dt: battle.dt, loadout: battle.loadout,
    inputs: battle.inputs.map(token).join(' '),
    end: endOf(battle), events: rec.count, hash: eventHash(rec), summary: summaryOut,
  };
}

/** The export as one line of JSON. */
export const exportText = (battle, rec) => JSON.stringify(buildExport(battle, rec));
