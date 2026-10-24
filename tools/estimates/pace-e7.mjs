// tools/estimates/pace-e7.mjs — the lead designer's pace study after L5e1 (§17 item 52, #318, #319): E7's
// reference battle (R2 against each of the reference four, both the standard enemy, 13n.1 (e)) on the locked
// builds of mission0/builds.js, as tools/sweep.mjs runs a cell, with the battle's shape (#318): (a) the first hit
// on the losing ship as a share of the battle, (b) the hits on the loser by its end, (c) how it ends. Run-time
// overrides only; changes nothing; never a canonical run (#241):
//   node tools/estimates/pace-e7.mjs [--ranges m,...] [--openings bow,broadside] [--seeds n,...] [--limit s]
//                                    [--builds a,... | --pairs a:b,...] [--cull2] [--orders slot=value,...] [--set group.name=value ...]
// --pairs names the battles (attacker:target) in place of R2 against --builds. Each battle also prints the cells damaged
// on each side (cell-damaged events); 'two-sided' means both sides took damage. --orders sets slots of both sides' standing orders over every preset (as tools/sweep.mjs's sets). --cull2 holds battle.cullDistance at twice the largest range (#318). A hit is an entry of battle.hits (a round
// that reached the side's hull or field); beams and warheads are not in it and are counted by their events.
import { PARAMS, withOverrides, ORDERS } from '../../js/data.js';
import { createBattle, runBattle, battleEvents } from '../../js/battle.js';
import { resultOf } from '../sweep.mjs';
import { BUILDS, REFERENCE } from '../../mission0/builds.js';

const argv = process.argv.slice(2), opt = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
const list = (s) => s.split(',');
const ranges = list(opt('--ranges', '600,900,1500')).map(Number), openings = list(opt('--openings', 'bow,broadside'));
const seeds = list(opt('--seeds', '1')).map(Number), limit = Number(opt('--limit', 600)), builds = list(opt('--builds', Object.keys(REFERENCE).join(',')));
const overrides = {};
for (let i = 0; i < argv.length; i++) if (argv[i] === '--set') { const [k, v] = argv[++i].split('='); overrides[k] = Number(v); }
if (argv.includes('--cull2')) overrides['battle.cullDistance'] = 2 * Math.max(...ranges);
for (const [k, v] of Object.entries(overrides)) { const [g, n] = k.split('.'), p = PARAMS[g][n]; if (!(v >= p.min && v <= p.max)) throw new Error(`${k}=${v} outside ${p.min}..${p.max}`); }
const params = withOverrides(overrides);
for (const r of ranges) { const p = PARAMS.battle.openingRange; if (!(r >= p.min && r <= p.max)) throw new Error(`range ${r} outside battle.openingRange's ${p.min}..${p.max}`); }
const orders = Object.fromEntries((opt('--orders', '') ? list(opt('--orders')) : []).map((x) => x.split('=')));
const pairs = opt('--pairs', null) ? list(opt('--pairs')).map((x) => x.split(':')) : builds.map((b) => ['R2', b]);
const STD = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };

/** One cell as tools/sweep.mjs's cellBattle, with the params overridden; `inputs` the player's verbs on side A. */
export function cell({ a, b, range, opening, seed, inputs = [], setA = orders, setB = orders }) {
  const broadside = opening === 'broadside';
  const x = createBattle({ params, attacker: BUILDS[a], target: BUILDS[b], distance: range, seed, knowledge: true,
    bearing: broadside ? '+y' : '+x', ...(broadside ? { attackerHeading: 0 } : {}), enemy: { A: STD, T: STD }, inputs: inputs.map((y) => ({ ...y, side: 'A' })) });
  x.attacker.helm.override = { ...x.attacker.helm.override, ...setA };
  x.target.helm.override = { ...x.target.helm.override, ...setB };
  try { return runBattle(x, limit); } catch (e) { x.error = `step ${x.step}: ${e.message}`; return x; } // a kernel throw is reported, never hidden
}
/** The shape of a battle (#318). */
export function shape(x) {
  if (x.error) return { dmgA: 0, dmgT: 0, kind: 'error', side: null, winner: null, T: x.t, t: x.t, loser: null, shots: x.shots, hitsA: 0, hitsT: 0, loserHits: 0, firstShare: null, firstHit: null, endEvent: x.error };
  const r = resultOf(x), loser = r.winner === 'A' ? 'T' : r.winner === 'T' ? 'A' : null, T = r.t ?? x.t;
  const on = (s) => x.hits.filter((h) => h.side === s);
  const lh = loser ? on(loser) : [];
  const dmg = (side) => { const L = side.world.log; return (L.events ?? L).filter((e) => e.type === 'cell-damaged').length; };
  return { ...r, T, loser, shots: x.shots, hitsA: on('A').length, hitsT: on('T').length, loserHits: lh.length,
    firstShare: lh.length ? lh[0].t / T : null, firstHit: x.hits.length ? x.hits[0].t : null, lastHit: x.hits.length ? x.hits[x.hits.length - 1].t : null,
    endEvent: x.ended ? x.ended.why || x.ended.kind : 'none', dmgA: dmg(x.attacker), dmgT: dmg(x.target) };
}
const med = (a) => { const s = [...a].sort((p, q) => p - q), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const f = (x, d = 1) => (x === null || x === undefined ? '-' : x.toFixed(d));

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`# E7 pace (${pairs.map((p) => p.join(' v ')).join(', ')}), ranges ${ranges}, ${openings}, seeds ${seeds}, limit ${limit} s, overrides ${JSON.stringify(overrides)}, orders ${JSON.stringify(orders)}`);
  const all = [];
  for (const [a, b] of pairs) for (const range of ranges) for (const opening of openings) for (const seed of seeds) {
    const s = shape(cell({ a, b, range, opening, seed }));
    all.push(s);
    console.log(`${a} v ${b.padEnd(7)} ${String(range).padStart(4)} ${opening.padEnd(9)} s${seed}: ${s.kind.padEnd(9)} ${String(s.side ?? '').padEnd(3)} t ${f(s.T).padStart(6)} s  win ${String(s.winner).padEnd(4)} hits A/T ${s.hitsA}/${s.hitsT} of ${s.shots}; first hit ${f(s.firstHit)} s, on loser ${s.loser ? `${f(s.firstShare, 2)} of the battle, ${s.loserHits} hits` : '-'}; end ${s.endEvent}; cells damaged A/T ${s.dmgA}/${s.dmgT}`);
  }
  const ends = all.filter((s) => s.kind !== 'none' && s.kind !== 'error');
  console.log(`kernel errors: ${all.filter((s) => s.kind === 'error').length}`);
  const kinds = {}; for (const s of all) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
  console.log(`E7: median end ${f(med(ends.map((s) => s.T)))} s over ${ends.length} of ${all.length} ended (no end by ${limit} s counts as ${limit} s: median ${f(med(all.map((s) => s.T)))} s); ends ${JSON.stringify(kinds)}`);
  const two = all.filter((s) => s.dmgA > 0 && s.dmgT > 0), twoEnded = two.filter((s) => s.kind !== 'none' && s.kind !== 'error');
  console.log(`two-sided: ${two.length} of ${all.length} battles damage both ships; their median end ${f(med(twoEnded.map((s) => s.T)))} s over ${twoEnded.length} ended (600 s rule ${f(med(two.map((s) => s.T)))} s), first hit on the loser ${f(med(twoEnded.filter((s) => s.firstShare !== null).map((s) => s.firstShare)), 2)}, hits on the loser ${f(med(twoEnded.filter((s) => s.loser).map((s) => s.loserHits)), 0)}`);
  const dec = all.filter((s) => s.loser);
  console.log(`shape over ${dec.length} decided: first hit on the loser median ${f(med(dec.filter((s) => s.firstShare !== null).map((s) => s.firstShare)), 2)} of the battle; hits on the loser median ${f(med(dec.map((s) => s.loserHits)), 0)} (${Math.min(...dec.map((s) => s.loserHits))}-${Math.max(...dec.map((s) => s.loserHits))}); hit rate ${f((100 * all.reduce((n, s) => n + s.hitsA + s.hitsT, 0)) / Math.max(1, all.reduce((n, s) => n + s.shots, 0)), 0)} %`);
}
