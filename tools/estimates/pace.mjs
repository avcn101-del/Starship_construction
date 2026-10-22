// tools/estimates/pace.mjs — the lead designer's pace study after the owner's
// playtest of prototype v2 (#254): how long a duel of two R1s lasts, and how
// often rounds hit, under run-time overrides within the approved ranges
// (#223's first rung). Reads js/ and the throwaway proto/battle.js (which
// reads the kernel only); changes nothing; never a canonical run.
//   node tools/estimates/pace.mjs [--seeds N] [--facing bow|broadside] [--range close|hold|open] [--set group.name=value ...]
// Both ships fly the prototype's enemy script (Fire 60 s / Cool 30 s, dodge on).
import { createBattle, tick } from '../../proto/battle.js';
import { SCRIPT, RANGES } from '../../proto/config.js';

const argv = process.argv.slice(2), arg = (n, f) => { const i = argv.indexOf(n); return i < 0 ? f : argv[i + 1]; };
const overrides = {};
for (let i = 0; i < argv.length; i++) if (argv[i] === '--set') { const [k, v] = argv[++i].split('='); overrides[k] = Number(v); }
const seeds = Number(arg('--seeds', 10)), limit = Number(arg('--limit', 1800));
const facings = arg('--facing') ? [arg('--facing')] : ['bow', 'broadside'], ranges = arg('--range') ? [arg('--range')] : Object.keys(RANGES);
const saved = SCRIPT.orders.facing;
console.log(`overrides ${JSON.stringify(overrides)}; ${seeds} seeds; limit ${limit} s`);
for (const facing of facings) for (const range of ranges) {
  SCRIPT.orders.facing = facing;
  const ts = []; let shots = 0, hits = 0, ends = {};
  for (let seed = 1; seed <= seeds; seed++) {
    const b = createBattle({ seed, overrides, scripted: { player: true, enemy: true }, scriptRange: range });
    while (!b.ended && b.t < limit) tick(b);
    shots += b.player.stats.shots + b.enemy.stats.shots; hits += b.player.stats.hits + b.enemy.stats.hits;
    const how = b.ended ? (b.ships.some((s) => s.destroyedBy) ? 'destroyed' : 'disabled') : 'none';
    ends[how] = (ends[how] || 0) + 1;
    if (b.ended) ts.push(b.ended.t);
  }
  ts.sort((a, b) => a - b);
  const med = ts.length ? (ts.length % 2 ? ts[(ts.length - 1) / 2] : (ts[ts.length / 2 - 1] + ts[ts.length / 2]) / 2) : null;
  console.log(`${facing.padEnd(9)} ${range.padEnd(5)} ${String(RANGES[range]).padStart(4)} m: median ${med === null ? '-' : med.toFixed(1)} s (min ${ts.length ? ts[0].toFixed(1) : '-'}, max ${ts.length ? ts[ts.length - 1].toFixed(1) : '-'}); hits ${hits}/${shots} (${shots ? ((100 * hits) / shots).toFixed(0) : '-'} %); ends ${JSON.stringify(ends)}`);
}
SCRIPT.orders.facing = saved;
