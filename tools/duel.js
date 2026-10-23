#!/usr/bin/env node
// tools/duel.js — one ship-versus-ship battle on the symmetric loop (DESIGN.md
// 13n.1 (d) (e), L5d; #277, #301): the player's side (A) flies the preset Fire
// with the player's verbs as inputs, the other side (T) is the enemy of
// js/enemy.js at a personality (default 0.5 each: the standard enemy), both
// with the knowledge model. It replays any battle played through
// tools/play.mjs from the replay line that tool prints: the same seed and the
// same inputs give the same battle hash and end (E2). No LLM, no network.
//
//   node tools/duel.js [<player ship> [<enemy ship>]] [--seed n] [--range m] [--limit s]
//                      [--inputs <json or file>] [--personality a,p,c,r | --wildcard] [--set group.name=value ...]
//   node tools/duel.js list
//
// Ships are named as in mission0/targets.js (TARGETS, SENSOR_SHIPS, WEAPON_SHIPS; default R1d-A against R1d-A). The
// player starts on the enemy's bow (bearing +x of its heading 0), each on the other's bow, at the range (default battle.openingRange), both at rest, bow-on. Inputs:
// a JSON list [{ t, verb: 'scan' | 'target' | 'preset', arg }] (inline or a file). Text only; never a canonical run.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { withOverrides, PARAMS } from '../js/data.js';
import { createBattle, runBattle, battleHash } from '../js/battle.js';
import { TARGETS, SENSOR_SHIPS, WEAPON_SHIPS, HELM_SHIPS } from '../mission0/targets.js';

export const SHIPS = { ...TARGETS, ...SENSOR_SHIPS, ...WEAPON_SHIPS, ...HELM_SHIPS };

/** The duel's battle (not yet run): `player` and `enemy` ship names, the seed, the range (m, or null), the inputs, the personality, the overrides. */
export function createDuel({ player = 'R1d-A', enemy = 'R1d-A', seed = 1, range = null, inputs = [], personality = null, overrides = {} } = {}) {
  if (!SHIPS[player]) throw new Error(`unknown ship ${player}`);
  if (!SHIPS[enemy]) throw new Error(`unknown ship ${enemy}`);
  const params = withOverrides(overrides);
  return createBattle({
    params, attacker: SHIPS[player], target: SHIPS[enemy], bearing: '+x', ...(range !== null ? { distance: range } : {}), seed,
    knowledge: true, orders: { A: 'fire' }, enemy: { T: personality || { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 } },
    inputs: inputs.map((x) => ({ ...x, side: 'A' })),
  });
}
/** The end of a battle in one line. */
export const endLine = (b) => (b.ended ? `${b.ended.kind} ${b.ended.side} at ${b.ended.t.toFixed(4)} s (step ${b.ended.step}, event ${b.ended.event}, parent ${b.ended.parent}${b.ended.why ? `, ${b.ended.why}` : ''}${b.ended.by ? `, by ${b.ended.by}` : ''})` : `none by step ${b.step}`);
/** The line that replays a battle (13n.1 (d)): the ships, the seed, the range, the limit, the inputs, the personality and the overrides. */
export function replayLine({ player, enemy, seed, range, limit, inputs, personality, overrides = {} }) {
  const pers = personality ? (personality.wildcard ? ' --wildcard' : ` --personality ${['aggression', 'patience', 'caution', 'resolve'].map((k) => personality[k]).join(',')}`) : '';
  const sets = Object.entries(overrides).map(([k, v]) => ` --set ${k}=${v}`).join('');
  return `node tools/duel.js ${player} ${enemy} --seed ${seed}${range !== null && range !== undefined ? ` --range ${range}` : ''} --limit ${limit}${pers}${sets} --inputs '${JSON.stringify(inputs.map(({ t, verb, arg }) => ({ t, verb, arg })))}'`;
}

/** Parse duel.js's arguments. */
export function parseArgs(argv) {
  const pos = [], o = { seed: 1, range: null, limit: 300, inputs: [], personality: null, overrides: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seed') o.seed = Number(argv[++i]);
    else if (a === '--range') o.range = Number(argv[++i]);
    else if (a === '--limit') o.limit = Number(argv[++i]);
    else if (a === '--inputs') { const x = argv[++i]; o.inputs = JSON.parse(fs.existsSync(x) ? fs.readFileSync(x, 'utf8') : x); }
    else if (a === '--wildcard') o.personality = { wildcard: true };
    else if (a === '--personality') { const [aggression, patience, caution, resolve] = argv[++i].split(',').map(Number); o.personality = { aggression, patience, caution, resolve }; }
    else if (a === '--set') {
      const [k, v] = argv[++i].split('='), [g, n] = k.split('.'), p = PARAMS[g] && PARAMS[g][n];
      if (!p) throw new Error(`unknown constant ${k}`);
      if (!(Number(v) >= p.min && Number(v) <= p.max)) throw new Error(`${k}=${v} is outside its approved range ${p.min}..${p.max}`);
      o.overrides[k] = Number(v);
    } else pos.push(a);
  }
  return { player: pos[0] || 'R1d-A', enemy: pos[1] || 'R1d-A', ...o };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const argv = process.argv.slice(2);
  if (argv[0] === 'list') { for (const k of Object.keys(SHIPS)) console.log(k); process.exit(0); }
  const o = parseArgs(argv), b = createDuel(o);
  runBattle(b, o.limit);
  console.log(`# duel ${o.player} (player, Fire) against ${o.enemy} (enemy ${o.personality ? JSON.stringify(b.target.enemy.personality) : 'standard 0.5'}), seed ${o.seed}, ${o.inputs.length} inputs`);
  console.log(`end: ${endLine(b)}; shots ${b.shots}, hits ${b.hits.length}, misses ${b.misses.length}`);
  console.log(`hash ${battleHash(b)}`);
}
