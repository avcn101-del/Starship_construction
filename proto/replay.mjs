#!/usr/bin/env node
// proto/replay.mjs — replays an export of the feel prototype (proto/export.js)
// headless (Node, no DOM): rebuilds the battle from its seed, loadout and the
// player's inputs by step, checks that its end and event hash equal the
// exported ones (MATCH or MISMATCH), and prints the full event log and each
// room's temperature peak. Not a Mission 0 scenario (#217).
//
//   node proto/replay.mjs <file.json> [--every S] [--quiet]
//
// --every S also prints, once per S simulated seconds, each room's
// temperature and integrity and each shield's state. --quiet prints only the
// check. Exit code 0 on MATCH, 1 on MISMATCH.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createBattle, tick, setTarget, setPreset, drainEvents } from './battle.js';
import { createRecorder, record, eventHash, endOf, decodeInputs } from './export.js';
import { PROTO_VERSION, LABELS, loadoutText } from './config.js';
import { roomTemperature, isDestroyed } from '../js/rooms.js';

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1]; };
const file = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1] === '--every'));
if (!file) { console.error('usage: node proto/replay.mjs <file.json> [--every S] [--quiet]'); process.exit(2); }
const every = opt('--every') === null ? null : Number(opt('--every')), quiet = argv.includes('--quiet');
const out = (s) => { if (!quiet) console.log(s); };

// The owner pastes the export into a file; tolerate text around the one JSON object.
const text = readFileSync(file, 'utf8'), json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
const x = JSON.parse(json), inputs = decodeInputs(x.inputs);
let head = '';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { head = 'unknown'; }
console.log(`export ${file}: version ${x.v} (this checkout: ${PROTO_VERSION}, git ${head}); seed ${x.seed}; ${inputs.length} inputs; ${x.end.ended ? 'ended' : 'exported mid-battle'} at step ${x.end.steps} (${x.end.t.toFixed(2)} s)`);
if (x.v !== PROTO_VERSION) console.log(`WARNING: the export is version ${x.v}, this checkout is ${PROTO_VERSION}: check out the commit of the version that was played.`);

const battle = createBattle({ seed: x.seed, loadout: x.loadout });
console.log(`loadout: ${loadoutText(battle.loadout)}`);
if (battle.dt !== x.dt) console.log(`WARNING: dt ${battle.dt} here, ${x.dt} in the export`);
const rec = createRecorder(battle);
const peaks = new Map(); // `${side}:${room}` -> { T, t }

const pad = (s, n) => String(s).padEnd(n);
const fmt = (v) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toPrecision(4)) : String(v));
const BASE = new Set(['t', 'side', 'type', 'room', 'cause', 'crew']);
function line(e) {
  const extra = Object.keys(e).filter((k) => !BASE.has(k)).map((k) => `${k}=${fmt(e[k])}`).join(' ');
  return `${e.t.toFixed(2).padStart(8)} ${e.side === 'player' ? 'P' : 'E'} ${pad(e.room, 9)} ${pad(e.type, 16)} cause=${pad(e.cause, 14)} crew=${e.crew === undefined ? '-' : e.crew}${extra ? ` ${extra}` : ''}`;
}
function peaksUpdate() {
  for (const s of battle.ships) for (const r of s.world.rooms) {
    const k = `${s.side}:${r.id}`, T = roomTemperature(r), p = peaks.get(k);
    if (!p || T > p.T) peaks.set(k, { T, t: battle.t });
  }
}
function snapshot() {
  for (const s of battle.ships) {
    const rooms = s.world.rooms.map((r) => {
      const integrity = r.cells.reduce((a, c) => a + (c.destroyed ? 0 : c.integrity), 0) / r.cells.length;
      return `${LABELS[r.id]} ${Math.round(roomTemperature(r))}K ${Math.round(integrity * 100)}%${isDestroyed(r) ? 'X' : r.shutdown ? '!' : ''}`;
    }).join(' | ');
    const sh = s.room('shield').shield;
    out(`  [${battle.t.toFixed(0).padStart(4)} s ${s.side === 'player' ? 'P' : 'E'} ${s.preset}] ${rooms} || shield ${sh.on ? (sh.down ? 'DOWN' : 'up') : 'off'} strength ${sh.strength.toFixed(2)} absorbing ${(sh.absorbed / 1e6).toFixed(2)} MW passing ${(sh.passed / 1e6).toFixed(2)} MW`);
  }
}

out('event log (t s, side, room, type, cause, crew, other fields):');
let next = 0, nextSnap = every;
peaksUpdate();
if (every) snapshot();
while (!battle.ended && battle.steps < x.end.steps) {
  while (next < inputs.length && inputs[next].step === battle.steps) {
    const i = inputs[next++], ship = battle[i.side];
    if (i.kind === 'target') setTarget(battle, ship, i.value);
    else if (i.kind === 'preset') setPreset(battle, ship, i.value);
    else throw new Error(`unknown input kind ${i.kind}`);
    out(`${battle.t.toFixed(2).padStart(8)} ${i.side === 'player' ? 'P' : 'E'} INPUT     ${i.kind} ${i.value} (step ${i.step})`);
  }
  if (next < inputs.length && inputs[next].step < battle.steps) throw new Error(`inputs out of order at step ${inputs[next].step}`);
  tick(battle);
  const evs = drainEvents(battle);
  record(rec, evs);
  for (const e of evs) out(line(e));
  peaksUpdate();
  if (every && battle.t >= nextSnap - 1e-9) { snapshot(); nextSnap += every; }
}
const late = inputs.length - next;
if (late) out(`${late} input(s) at or after the export step (${x.end.steps}) change nothing and were not applied`);

out('\ntemperature peaks (K, at s):');
for (const s of battle.ships) {
  out(`  ${s.side}: ${s.world.rooms.map((r) => { const p = peaks.get(`${s.side}:${r.id}`); return `${r.id} ${Math.round(p.T)} at ${p.t.toFixed(1)}`; }).join('; ')}`);
}

const got = endOf(battle), hash = eventHash(rec);
const same = JSON.stringify(got) === JSON.stringify(x.end) && hash === x.hash && rec.count === x.events;
console.log(`\nend   export:  ${JSON.stringify(x.end)}\nend   replay:  ${JSON.stringify(got)}`);
console.log(`hash  export:  ${x.hash} (${x.events} events)\nhash  replay:  ${hash} (${rec.count} events)`);
console.log(same ? 'MATCH' : 'MISMATCH');
process.exit(same ? 0 : 1);
