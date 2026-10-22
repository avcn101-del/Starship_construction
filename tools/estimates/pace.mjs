// tools/estimates/pace.mjs — the lead designer's pace study (#254, #255): how
// long a duel of two equal ships lasts and how often rounds hit, on the
// prototype's battle (proto/battle.js, which reads the kernel only), under
// run-time overrides within the approved ranges. Changes nothing; never a
// canonical run.
//   node tools/estimates/pace.mjs [--layout R1|R1B|R1C] [--seeds N] [--limit s]
//     [--facing bow|broadside] [--range close|hold|open] [--set group.name=value ...]
// Both ships fly the prototype's enemy script (Fire 60 s / Cool 30 s, dodge on).
// The end is judged here by #255's rule (Disabled = no weapon able to fire for
// battle.disabledSeconds, whatever the engine does; destroyed as the prototype
// says), not by the prototype's own end, which still counts thrust.
import { createBattle, tick, abilities } from '../../proto/battle.js';
import { SCRIPT, RANGES } from '../../proto/config.js';

const argv = process.argv.slice(2), arg = (n, f) => { const i = argv.indexOf(n); return i < 0 ? f : argv[i + 1]; };
const overrides = {};
for (let i = 0; i < argv.length; i++) if (argv[i] === '--set') { const [k, v] = argv[++i].split('='); overrides[k] = Number(v); }
const seeds = Number(arg('--seeds', 10)), limit = Number(arg('--limit', 900)), layout = arg('--layout', 'R1');
const facings = arg('--facing') ? [arg('--facing')] : ['bow', 'broadside'], ranges = arg('--range') ? [arg('--range')] : Object.keys(RANGES);
const saved = SCRIPT.orders.facing;
console.log(`layout ${layout}; overrides ${JSON.stringify(overrides)}; ${seeds} seeds; limit ${limit} s; Disabled by #255 (weapons only)`);
for (const facing of facings) for (const range of ranges) {
  SCRIPT.orders.facing = facing;
  const ts = []; let shots = 0, hits = 0; const ends = {};
  for (let seed = 1; seed <= seeds; seed++) {
    const b = createBattle({ seed, overrides, scripted: { player: true, enemy: true }, loadout: { layout }, scriptRange: range });
    const since = { player: null, enemy: null };
    let end = null;
    while (!end && b.t < limit) {
      tick(b);
      for (const s of b.ships) {
        const a = abilities(s);
        if (a.beam || a.turret) since[s.side] = null;
        else if (since[s.side] === null) since[s.side] = b.t;
        if (since[s.side] !== null && b.t - since[s.side] >= b.disabledSeconds - 1e-9) end = { t: b.t, how: 'disabled' };
      }
      if (!end && b.ended && b.ships.some((s) => s.destroyedBy)) end = { t: b.ended.t, how: 'destroyed' };
    }
    shots += b.player.stats.shots + b.enemy.stats.shots; hits += b.player.stats.hits + b.enemy.stats.hits;
    const how = end ? end.how : 'none';
    ends[how] = (ends[how] || 0) + 1;
    if (end) ts.push(end.t);
  }
  ts.sort((a, b) => a - b);
  const med = ts.length ? (ts.length % 2 ? ts[(ts.length - 1) / 2] : (ts[ts.length / 2 - 1] + ts[ts.length / 2]) / 2) : null;
  console.log(`${layout} ${facing.padEnd(9)} ${range.padEnd(5)} ${String(RANGES[range]).padStart(4)} m: median ${med === null ? '-' : med.toFixed(1)} s (min ${ts.length ? ts[0].toFixed(1) : '-'}, max ${ts.length ? ts[ts.length - 1].toFixed(1) : '-'}); hits ${hits}/${shots} (${shots ? ((100 * hits) / shots).toFixed(0) : '-'} %); ends ${JSON.stringify(ends)}`);
}
SCRIPT.orders.facing = saved;
