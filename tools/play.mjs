#!/usr/bin/env node
// tools/play.mjs — the play harness (DESIGN.md 13n.1 (d), L5d; #42, #277, #301):
// a text interface on the player's side of a duel (tools/duel.js: the player A
// on the preset Fire, the enemy of js/enemy.js on T). Every `--every` seconds it
// prints the player's knowledge model as text — the silhouette, the resolved
// zones and the rooms they revealed, the sources resolved, and its own heat,
// buffer, ammunition and able weapons — and reads one verb from stdin:
// `scan <zone>`, `target <room>`, `preset <fire|cool|evade>`, or an empty line
// for nothing. At the end it prints the cascade tree, the per-second log and the
// replay line `node tools/duel.js ... --seed ... --inputs ...`. No LLM, no
// network, no key: the player is whoever types (an agent reading only this text,
// or the owner). A result without its replay line does not count (CLAUDE.md).
//
//   node tools/play.mjs [<player ship> [<enemy ship>]] [--every s] [--seed n] [--range m] [--limit s]
//                       [--personality a,p,c,r | --wildcard] [--quiet]
//
// stdin may be a file of verbs, one per prompt (a played battle's script); `--quiet` prints only the end, the hash
// and the replay line.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { tick, battleHash, battleTree, weaponStates } from '../js/battle.js';
import { stepsAtLeast } from '../js/util.js';
import { heatFraction, bufferFraction } from '../js/helm.js';
import { createDuel, parseArgs, replayLine, endLine } from './duel.js';

const f1 = (x) => x.toFixed(1);
/**
 * The player's knowledge model as text (#42): only what its model holds and its own ship. Nothing of the other world
 * is read: the silhouette (cells standing, the pose), the zones resolved (with the step), each known room (id, type,
 * cells known and standing, the mean integrity the model holds, its IR class), the sources resolved this step.
 */
export function modelText(battle, side) {
  const m = side.model, w = side.world, lines = [];
  const pose = m.silhouette.bodies.find((b) => b.id === 'body-0') || m.silhouette.bodies[0];
  lines.push(`t=${battle.t.toFixed(2)} s, preset ${side.helm.orders.name}, mode ${side.helm.mode || '-'}`);
  lines.push(`enemy silhouette: ${m.silhouette.cells.length} cells standing, ${m.silhouette.bodies.length} bodies${pose ? `, at (${f1(pose.x[0])}, ${f1(pose.x[1])}) heading ${pose.theta.toFixed(3)}` : ''}`);
  lines.push(`zones resolved: ${[...m.resolved.entries()].map(([z, s]) => `${z}@${s}`).join(' ') || 'none'} (of 0-5)`);
  for (const [id, r] of [...m.rooms.entries()].sort()) {
    const cells = r.cells.map((k) => m.cells.get(k)), standing = cells.filter((c) => !c.destroyed);
    const integrity = cells.reduce((x, c) => x + c.integrity, 0) / cells.length;
    lines.push(`  room ${id} (${r.type}): ${cells.length} cells known, ${standing.length} standing, integrity ${integrity.toFixed(2)} at scan step ${r.step}${r.ir ? `, IR ${r.ir.class}` : ''}`);
  }
  const now = [...m.sources.entries()].filter(([, s]) => s.now);
  lines.push(`sources resolved now: ${now.map(([, s]) => `${s.kind}${s.class ? ' ' + s.class : ''} at (${f1(s.position[0])}, ${f1(s.position[1])})`).join('; ') || 'none'}`);
  const held = (g) => g.ap + g.he + (g.typed ? Object.values(g.typed).reduce((x, y) => x + y, 0) : 0);
  const ammo = w.rooms.filter((r) => r.type === 'turret').map((r) => `${r.id} ${r.turret.ammo} ready`)
    .concat(w.rooms.filter((r) => r.type === 'magazine').map((r) => `${r.id} ${r.magazine.missiles ? `${r.magazine.missiles} missiles` : r.magazine.slugMass ? `${f1(r.magazine.slugMass)} kg of slugs` : `${held(r.magazine)} rounds`}`))
    .concat(w.rooms.filter((r) => r.type === 'missileBay').map((r) => `${r.id} ${r.missileBay.ready.length} ready`));
  const able = weaponStates(w).map((x) => `${x.room.id} ${x.able ? 'able' : x.why}`);
  lines.push(`own ship: heat ${heatFraction(w).toFixed(2)} of hot, buffer ${bufferFraction(battle, w).toFixed(2)}, ammunition ${ammo.join(', ')}; weapons ${able.join(', ')}`);
  return lines.join('\n');
}

/** Parse a verb line: { verb, arg } or null for nothing; throws on a line it cannot read. */
export function parseVerb(line) {
  const [v, a] = line.trim().split(/\s+/);
  if (!v) return null;
  if (v === 'scan') { const z = Number(a); if (!Number.isInteger(z) || z < 0 || z > 5) throw new Error(`scan takes a zone 0-5, not ${a}`); return { verb: 'scan', arg: z }; }
  if (v === 'target') { if (!a) throw new Error('target takes a room id'); return { verb: 'target', arg: a }; }
  if (v === 'preset') { if (!['fire', 'cool', 'evade'].includes(a)) throw new Error(`preset takes fire, cool or evade, not ${a}`); return { verb: 'preset', arg: a }; }
  throw new Error(`unknown verb ${v}: scan <zone>, target <room>, preset <name>, or nothing`);
}

/**
 * Play a duel: `next(text)` returns the next verb line (or '' for nothing) given the model's text. Returns { battle,
 * inputs, texts, replay }.
 */
export async function play(opts, next) {
  const b = createDuel(opts), every = stepsAtLeast(opts.every ?? 5, b.dt), steps = stepsAtLeast(opts.limit, b.dt), inputs = [], texts = [];
  while (!b.ended && b.step < steps) {
    if (b.step % every === 0) {
      const text = modelText(b, b.attacker);
      texts.push(text);
      const line = await next(text);
      let v = null;
      try { v = parseVerb(line || ''); } catch (e) { texts.push(`(${e.message})`); }
      if (v) { const x = { t: b.t, ...v }; inputs.push(x); b.inputs.push({ ...x, side: 'A', step: b.step, done: false }); }
    }
    tick(b);
  }
  return { battle: b, inputs, texts, replay: replayLine({ ...opts, inputs }) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const argv = process.argv.slice(2), quiet = argv.includes('--quiet');
  const ei = argv.indexOf('--every'), every = ei >= 0 ? Number(argv[ei + 1]) : 5;
  const o = { ...parseArgs(argv.filter((x, i) => x !== '--quiet' && i !== ei && i !== ei + 1)), every };
  const lines = process.stdin.isTTY ? null : fs.readFileSync(0, 'utf8').split('\n');
  const rl = process.stdin.isTTY ? createInterface({ input: process.stdin, output: process.stdout }) : null;
  const next = async (text) => {
    if (!quiet || rl) console.log(`\n${text}`);
    if (rl) return new Promise((res) => rl.question('verb> ', res));
    const l = lines.length ? lines.shift() : '';
    if (!quiet) console.log(`verb> ${l}`);
    return l;
  };
  const r = await play(o, next);
  if (rl) rl.close();
  if (!quiet) {
    for (const s of battleTree(r.battle)) { console.log(`\n## cascade tree, ${s.side}`); for (const l of s.lines) console.log(l); }
    console.log('\n## per-second log'); for (const l of r.battle.lines) console.log(l);
  }
  console.log(`\nend: ${endLine(r.battle)}`);
  console.log(`hash ${battleHash(r.battle)}`);
  console.log(`replay: ${r.replay}`);
}
