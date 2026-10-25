#!/usr/bin/env node
// proto/play.mjs — plays one phases battle headless as the player would on the page (DESIGN.md 13n.12, #366), on the
// page's own modules (proto/battle.js, proto/phases.js, proto/export.js), and writes its export for proto/replay.mjs.
// The player's script: scan zone 2 at the start, target the first room its model knows, at decision point 1 Close in,
// at decision point 2 Stand off; the pause setting on, so every decision is a recorded choice. Not a Mission 0 result
// (#217); adds no number to the battle.
//
//   node proto/play.mjs <player> <enemy> [--opening rangeHold|rangeOpen] [--aspect bow|broadside] [--seed n] [--limit s] [--out file]
import { writeFileSync } from 'node:fs';
import { startBattle, playVerb, tick } from './battle.js';
import { waiting, choose } from './phases.js';
import { buildExport } from './export.js';

const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const [player, enemy] = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
if (!player || !enemy) { console.error('usage: node proto/play.mjs <player> <enemy> [--opening rangeHold|rangeOpen] [--aspect bow|broadside] [--seed n] [--limit s] [--out file]'); process.exit(2); }
const limit = Number(opt('limit', 600)), out = opt('out', `proto-play-${player}-${enemy}.json`);
const b = startBattle({ player, enemy, opening: opt('opening', 'rangeOpen'), aspect: opt('aspect', 'bow'), seed: Number(opt('seed', 1)), pause: true });
playVerb(b, 'scan', 2);
let targeted = false;
while (!b.ended && b.t < limit) {
  if (waiting(b)) choose(b, b.phases.A.pending.dp === 1 ? 'closeIn' : 'standOff');
  if (!targeted && b.attacker.model.rooms.size) { playVerb(b, 'target', [...b.attacker.model.rooms.keys()][0]); targeted = true; }
  tick(b);
}
const x = buildExport(b);
writeFileSync(out, JSON.stringify(x));
console.log(`${player} v ${enemy}: ${x.end}; choices ${JSON.stringify(x.choices)}; verbs ${x.inputs.map((v) => `${v.t.toFixed(2)}:${v.verb}:${v.arg}`).join(' ')}; hash ${x.hash}; written ${out}`);
