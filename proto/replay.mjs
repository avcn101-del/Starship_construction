#!/usr/bin/env node
// proto/replay.mjs — replays an export of the feel prototype (proto/export.js)
// headless through tools/duel.js (DESIGN.md 13n.1 (d), #301 (5)): rebuilds the
// battle with tools/duel.js's createDuel from the export's seed, overrides and
// inputs, runs it to the exported step (or its end), and prints the battle
// hash and the end; both must equal the export's (MATCH, exit 0; else
// MISMATCH, exit 1). It also checks that the export's replay line is the one
// tools/duel.js's replayLine builds (the page's mirror, proto/duel.js). Not a
// Mission 0 scenario (#217).
//
//   node proto/replay.mjs <file.json> [--log]
//
// --log also prints the per-second log of the kernel (js/battle.js) and the
// cascade tree of each side. Text around the JSON is ignored.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tick, battleHash, battleTree } from '../js/battle.js';
import { createDuel, replayLine, endLine } from '../tools/duel.js';
import { PROTO_VERSION } from './config.js';

const argv = process.argv.slice(2), file = argv.find((a) => !a.startsWith('--')), log = argv.includes('--log');
if (!file) { console.error('usage: node proto/replay.mjs <file.json> [--log]'); process.exit(2); }
const text = readFileSync(file, 'utf8'), x = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
let head = 'unknown';
try { head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* not a checkout */ }
console.log(`export ${file}: version ${x.v} (this checkout: ${PROTO_VERSION}, git ${head}); seed ${x.seed}; ${x.inputs.length} inputs; ${x.ended ? 'ended' : 'exported mid-battle'} at step ${x.step} (${x.t.toFixed(4)} s)`);
if (x.v !== PROTO_VERSION) console.log(`WARNING: the export is version ${x.v}, this checkout is ${PROTO_VERSION}: check out the commit of the version that was played.`);

const b = createDuel({ seed: x.seed, inputs: x.inputs, overrides: x.overrides || {} });
while (!b.ended && b.step < x.step) tick(b);
if (log) {
  for (const l of b.lines) console.log(l);
  for (const s of battleTree(b)) { console.log(`\n## cascade tree, ${s.side}`); for (const l of s.lines) console.log(l); }
  console.log('');
}
const line = replayLine({ player: 'R1d-A', enemy: 'R1d-A', seed: x.seed, range: null, limit: x.t, inputs: x.inputs, personality: null, overrides: x.overrides || {} });
const hash = battleHash(b), end = endLine(b);
console.log(`replay line export: ${x.replay}`);
console.log(`replay line tools:  ${line}${line === x.replay ? '' : '  (DIFFERENT)'}`);
console.log(`end  export: ${x.end}\nend  replay: ${end}`);
console.log(`hash export: ${x.hash}\nhash replay: ${hash}`);
const same = hash === x.hash && end === x.end && line === x.replay && b.step === x.step;
console.log(same ? 'MATCH' : 'MISMATCH');
process.exit(same ? 0 : 1);
