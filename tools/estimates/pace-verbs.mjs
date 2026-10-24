// tools/estimates/pace-verbs.mjs — the lead designer's pace study after L5e1 (#319): verb leverage, the share of
// battles one player verb flips, and the decisions available per battle (the moments at which some verb changes
// the result). Side A is the player (R2 flying the preset Fire with the verb as its one input, as tools/duel.js),
// side T the standard enemy on a reference build, on the locked builds of mission0/builds.js. The verbs: each preset,
// a scan of each zone, a target on each of the other build's rooms. Run-time overrides only; never a canonical run:
//   node tools/estimates/pace-verbs.mjs [--builds a,...] [--ranges m,...] [--openings bow,broadside] [--seed n]
//                                       [--times s,... | --every s [--max-moments n]] [--limit s] [--cull2] [--set group.name=value ...]
// --times lists the verb's moments (default 0); --every s tries every multiple of s before the baseline's end, at most
// --max-moments of them (default 12).
// A result is the winner (A, T, draw or none); a verb flips a battle when its winner differs from the baseline's.
import { PARAMS, withOverrides, PRESETS } from '../../js/data.js';
import { createBattle, runBattle } from '../../js/battle.js';
import { resultOf } from '../sweep.mjs';
import { BUILDS, REFERENCE } from '../../mission0/builds.js';

const argv = process.argv.slice(2), opt = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
const list = (s) => s.split(',');
const ranges = list(opt('--ranges', '600,900,1500')).map(Number), openings = list(opt('--openings', 'bow,broadside'));
const seed = Number(opt('--seed', 1)), limit = Number(opt('--limit', 600)), builds = list(opt('--builds', Object.keys(REFERENCE).join(',')));
const every = opt('--every', null), maxMoments = Number(opt('--max-moments', 12)), times = every ? null : list(opt('--times', '0')).map(Number);
const overrides = {};
for (let i = 0; i < argv.length; i++) if (argv[i] === '--set') { const [k, v] = argv[++i].split('='); overrides[k] = Number(v); }
if (argv.includes('--cull2')) overrides['battle.cullDistance'] = 2 * Math.max(...ranges);
for (const [k, v] of Object.entries(overrides)) { const [g, n] = k.split('.'), p = PARAMS[g][n]; if (!(v >= p.min && v <= p.max)) throw new Error(`${k}=${v} outside ${p.min}..${p.max}`); }
for (const r of ranges) { const p = PARAMS.battle.openingRange; if (!(r >= p.min && r <= p.max)) throw new Error(`range ${r} outside battle.openingRange's ${p.min}..${p.max}`); }
const errors = [];
const params = withOverrides(overrides), STD = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };

function duel(b, range, opening, inputs) {
  const broadside = opening === 'broadside';
  const x = createBattle({ params, attacker: BUILDS.R2, target: BUILDS[b], distance: range, seed, knowledge: true,
    bearing: broadside ? '+y' : '+x', ...(broadside ? { attackerHeading: 0 } : {}), orders: { A: 'fire' }, enemy: { T: STD },
    inputs: inputs.map((y) => ({ ...y, side: 'A' })) });
  // A kernel throw is reported as a result of its own (#326's pace study found one in beamsOut), never hidden.
  try { return resultOf(runBattle(x, limit)); } catch (e) { errors.push(`${b} ${range} ${opening} ${JSON.stringify(inputs)}: step ${x.step}: ${e.message}`); return { winner: 'error', kind: 'error', t: x.t }; }
}
const verbs = (b) => [...Object.keys(PRESETS).map((p) => ['preset', p]), ...[0, 1, 2, 3, 4, 5].map((z) => ['scan', z]), ...BUILDS[b].rooms.map((r) => ['target', r.id])];
const tag = (r) => `${r.winner ?? 'none'}${r.t === null ? '' : ` ${r.t.toFixed(1)} s`}`;

let cells = 0, flipped = 0, helped = 0, hurt = 0, moments = 0, live = 0;
const best = {};
console.log(`# verb leverage (R2 the player on Fire, against the standard enemy), seed ${seed}, limit ${limit} s, overrides ${JSON.stringify(overrides)}`);
for (const b of builds) for (const range of ranges) for (const opening of openings) {
  const base = duel(b, range, opening, []), end = base.t ?? limit;
  const ts = times || Array.from({ length: Math.min(maxMoments, Math.ceil(end / Number(every))) }, (_, i) => i * Number(every));
  const score = (w) => (w === 'A' ? 1 : w === 'draw' ? 0.5 : 0);
  let cellFlips = 0; const lines = [];
  for (const t of ts) {
    let flips = 0;
    for (const [verb, arg] of verbs(b)) {
      const r = duel(b, range, opening, [{ t, verb, arg }]);
      if (r.winner === 'error') continue; // counted under kernel errors, not as a flip
      cells++;
      if (r.winner !== base.winner) {
        flips++; flipped++;
        const d = score(r.winner) - score(base.winner);
        if (d > 0) { helped++; best[`${verb} ${arg}`] = (best[`${verb} ${arg}`] || 0) + 1; } else if (d < 0) hurt++;
        lines.push(`    t ${t} ${verb} ${arg}: ${tag(r)}`);
      }
    }
    moments++; if (flips) live++;
    cellFlips += flips;
  }
  console.log(`R2 v ${b.padEnd(7)} ${String(range).padStart(4)} ${opening.padEnd(9)}: baseline ${tag(base)}; ${cellFlips} flips over ${ts.length} moment(s) x ${verbs(b).length} verbs`);
  for (const l of lines) console.log(l);
}
console.log(`verb leverage: ${flipped} of ${cells} single-verb battles flip the result (${((100 * flipped) / cells).toFixed(1)} %): ${helped} toward the player, ${hurt} against; moments with a flip ${live} of ${moments}`);
console.log(`verbs that turn a result toward the player: ${JSON.stringify(best)}`);
console.log(`kernel errors: ${errors.length}`); for (const e of errors) console.log(`  ERROR ${e}`);
