#!/usr/bin/env node
// tools/battle.js — prints one L4b battle (DESIGN.md 13l.1): its per-second log
// (#129: one line per whole second per ship, then the events since the last
// line with their cause and parent), the cascade tree of each ship (#41: each
// root, then every event it caused, indented), the end and the battle's hash
// (E2). Text only; never a canonical run.
//
//   node tools/battle.js <case> [--set group.name=value ...] [--limit s] [--tree-only] [--log-only]
//   node tools/battle.js list
//
// The cases are the battles of the L4b scenarios (13l.4), the attacker R1d at
// rest 900 m from the target on the case's bearing. An event whose parent is
// neither a root nor an earlier event is printed as ERROR and the exit code is 1.
import { withOverrides, PARAMS } from '../js/data.js';
import { createBattle, runBattle, battleHash, battleTree } from '../js/battle.js';
import { TARGETS, ATTACKER } from '../mission0/targets.js';

export const CASES = {
  B1: { note: 'decapitation (L4.route.decapitate, L4.cascade, L4.log, L4.e8)', target: 'R1', bearing: '-y', plan: { turret: ['bridge'] } },
  B2: { note: 'mission kill (L4.route.missionKill)', target: 'R1', bearing: '+y', plan: { turret: ['beamBay', 'turret'] } },
  B3: { note: 'split at the neck (L4.route.split)', target: 'T-neck', bearing: '-y', plan: { turret: ['hold'] } },
  B3naive: { note: 'the naive order, beam bay first (L4.route.split)', target: 'T-neck', bearing: '-y', plan: { turret: ['beamBay'] }, limit: 120 },
  B4: { note: 'overheat, the beam on the turret (L4.route.overheat)', target: 'T-gun', bearing: '+x', plan: { beam: ['turret'] } },
  B5: { note: 'run dry, T-gun firing broadside (L4.route.dry)', target: 'T-gun', bearing: '-y', plan: {}, targetFire: { aim: [0, 1] }, limit: 400 },
  B6mag: { note: 'R1, rounds into the magazine (L4.kill, L4.cascade)', target: 'R1', bearing: '-y', plan: { turret: ['magazine'] } },
  B6reactor: { note: 'R1, rounds into the reactor (L4.kill)', target: 'R1', bearing: '-y', plan: { turret: ['reactor'] } },
  B6citadel: { note: 'R1d, rounds into the magazine through its citadel (L4.kill)', target: 'R1d', bearing: '-y', plan: { turret: ['magazine'] } },
  B6beam: { note: 'R1d, the beam on the magazine (L4.kill)', target: 'R1d', bearing: '-y', plan: { beam: ['magazine'] } },
  R1dDecap: { note: 'R1d, decapitation (13l.3)', target: 'R1d', bearing: '-y', plan: { turret: ['bridge'] } },
  R1dMission: { note: 'R1d, mission kill against the plated turret (13l.3)', target: 'R1d', bearing: '+y', plan: { turret: ['beamBay', 'turret'] } },
};

const args = process.argv.slice(2), name = args[0];
if (!name || name === 'list') {
  for (const [k, c] of Object.entries(CASES)) console.log(`${k.padEnd(11)} ${c.note}`);
  process.exit(0);
}
const c = CASES[name];
if (!c) { console.error(`unknown case ${name}; node tools/battle.js list`); process.exit(2); }
const overrides = {};
for (let i = 1; i < args.length; i++) if (args[i] === '--set') {
  const [k, v] = args[++i].split('='), [g, n] = k.split('.'), p = PARAMS[g] && PARAMS[g][n];
  if (!p) throw new Error(`unknown constant ${k}`);
  if (!(Number(v) >= p.min && Number(v) <= p.max)) throw new Error(`${k}=${v} is outside its approved range ${p.min}..${p.max}`);
  overrides[k] = Number(v);
}
const at = args.indexOf('--limit'), limit = at > 0 ? Number(args[at + 1]) : c.limit || 300;
const b = runBattle(createBattle({ params: withOverrides(overrides), attacker: ATTACKER, target: TARGETS[c.target], bearing: c.bearing, plan: c.plan, targetFire: c.targetFire || null }), limit);
console.log(`# ${name}: ${c.note}; target ${c.target}, attacker R1d on bearing ${c.bearing}, seed ${b.seed}${Object.keys(overrides).length ? `; overrides ${JSON.stringify(overrides)}` : ''}`);
if (!args.includes('--tree-only')) { console.log('\n## per-second log'); for (const l of b.lines) console.log(l); }
let errors = 0;
if (!args.includes('--log-only')) for (const s of battleTree(b)) {
  console.log(`\n## cascade tree, ${s.side === 'A' ? 'attacker' : 'target'} (${s.side})`);
  for (const l of s.lines) console.log(l);
  errors += s.errors.length;
}
console.log(`\nend: ${b.ended ? `${b.ended.kind} ${b.ended.side} at ${b.ended.t.toFixed(4)} s (step ${b.ended.step}, event ${b.ended.event}, parent ${b.ended.parent}${b.ended.why ? `, ${b.ended.why}` : ''}${b.ended.by ? `, by ${b.ended.by}` : ''})` : `none by ${limit} s`}; shots ${b.shots}, hits ${b.hits.length}, misses ${b.misses.length}`);
console.log(`hash ${battleHash(b)}${errors ? `; ${errors} ERROR(S): an event whose parent is neither a root nor an earlier event` : ''}`);
process.exitCode = errors ? 1 : 0;
