// tools/estimates/pace-e7.mjs — the lead designer's pace study after L5e1 (§17 item 52, #318, #319): E7's
// reference battle (R2 against each of the reference four, both the standard enemy, 13n.1 (e)) on the locked
// builds of mission0/builds.js, as tools/sweep.mjs runs a cell, with the battle's shape (#318): (a) the first hit
// on the losing ship as a share of the battle, (b) the hits on the loser by its end, (c) how it ends. Run-time
// overrides only; changes nothing; never a canonical run (#241):
//   node tools/estimates/pace-e7.mjs [--ranges m,...] [--openings bow,broadside] [--seeds n,...] [--limit s]
//                                    [--builds a,... | --pairs a:b,...] [--jobs n] [--cull2] [--orders slot=value,...] [--set group.name=value ...]
// --jobs runs the battles on n worker threads (default one per core); the output does not depend on it.
// --pairs names the battles (attacker:target) in place of R2 against --builds. Each battle also prints the cells damaged
// on each side (cell-damaged events); 'two-sided' means both sides took damage. --orders sets slots of both sides' standing orders over every preset (as tools/sweep.mjs's sets). --cull2 holds battle.cullDistance at twice the largest range (#318). A hit is an entry of battle.hits (a round
// that reached the side's hull or field); beams and warheads are not in it and are counted by their events.
// The tools pass (13n.11, #351): each battle also prints each side's outcome (tools/sweep.mjs's outcomeOf: win, loss,
// escape, let go, draw, stalemate, no end), the time of the first 'hot' event on each side ('-' if none) and, when it
// ends in a win or loss, the longest quiet gap (no cell-damaged event on either ship) from t = 0 and from the first
// cell-damaged event, each to the end; the summary counts the outcomes apart, survival per side and, per pair, the
// first hot room's median and minimum (#337 (A)) and both quiet gaps' maximum and median over the kills (#337 (D)).
import { PARAMS, withOverrides, ORDERS } from '../../js/data.js';
import { createBattle, runBattle, battleHash } from '../../js/battle.js';
import { BUILDS, REFERENCE } from '../../mission0/builds.js';
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

const argv = isMainThread ? process.argv.slice(2) : workerData.argv, opt = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
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
/** A side's outcome as tools/sweep.mjs's outcomeOf (copied with resultOf: importing sweep.mjs in a worker starts its own worker loop). */
const OUTCOMES = ['win', 'loss', 'escape', 'letGo', 'draw', 'stalemate', 'noEnd'];
const OUTCOME_LABEL = { win: 'win', loss: 'loss', escape: 'escape', letGo: 'let go', draw: 'draw', stalemate: 'stalemate', noEnd: 'no end' };
function outcomeOf(ended, side) {
  if (!ended) return 'noEnd';
  if (ended.kind === 'draw') return 'draw';
  if (ended.kind === 'stalemate') return 'stalemate';
  if (ended.kind === 'escaped') return ended.side === side ? 'escape' : 'letGo';
  return ended.side === side ? 'loss' : 'win'; // destroyed, disabled, surrender
}
const survives = (outcome) => outcome !== 'loss' && outcome !== 'draw';
/** A battle's result as tools/sweep.mjs's resultOf (copied). */
function resultOf(b) {
  const e = b.ended, outcome = { A: outcomeOf(e, 'A'), T: outcomeOf(e, 'T') };
  const winner = outcome.A === 'win' ? 'A' : outcome.T === 'win' ? 'T' : outcome.A === 'draw' ? 'draw' : null;
  const crew = Object.fromEntries(b.sides.map((s) => [s.name, s.world.rooms.reduce((n, r) => n + r.crew, 0)]));
  return { winner, outcome, crew, kind: e ? e.kind : 'none', side: e ? e.side : null, t: e ? e.t : null, step: e ? e.step : b.step, hash: battleHash(b) };
}
/** The longest interval of `times` (sorted) between `from` and `end`, both included as bounds. */
const longestGap = (times, from, end) => { let g = 0, last = from; for (const t of times) { g = Math.max(g, t - last); last = t; } return Math.max(g, end - last); };
/** The shape of a battle (#318). */
export function shape(x) {
  if (x.error) return { dmgA: 0, dmgT: 0, kind: 'error', side: null, winner: null, outcome: null, T: x.t, t: x.t, loser: null, shots: x.shots, hitsA: 0, hitsT: 0, loserHits: 0, firstShare: null, firstHit: null, endEvent: x.error, hotA: null, hotT: null, quiet0: null, quietDmg: null };
  const r = resultOf(x), loser = r.winner === 'A' ? 'T' : r.winner === 'T' ? 'A' : null, T = r.t ?? x.t;
  const on = (s) => x.hits.filter((h) => h.side === s);
  const lh = loser ? on(loser) : [];
  const evs = (side) => { const L = side.world.log; return L.events ?? L; };
  const dmg = (side) => evs(side).filter((e) => e.type === 'cell-damaged').length;
  const hot = (side) => { const e = evs(side).find((y) => y.type === 'hot'); return e ? e.t : null; };
  // The quiet gaps (#337 (D)), only for a battle that ends in a kill (a win for one side, a loss for the other).
  const kill = r.outcome.A === 'win' || r.outcome.A === 'loss';
  const dt = x.sides.flatMap((s) => evs(s).filter((e) => e.type === 'cell-damaged').map((e) => e.t)).sort((p, q) => p - q);
  const quiet0 = kill ? longestGap(dt, 0, T) : null, quietDmg = kill && dt.length ? longestGap(dt.slice(1), dt[0], T) : null;
  return { ...r, T, loser, hotA: hot(x.attacker), hotT: hot(x.target), quiet0, quietDmg, shots: x.shots, hitsA: on('A').length, hitsT: on('T').length, loserHits: lh.length,
    firstShare: lh.length ? lh[0].t / T : null, firstHit: x.hits.length ? x.hits[0].t : null, lastHit: x.hits.length ? x.hits[x.hits.length - 1].t : null,
    endEvent: x.ended ? x.ended.why || x.ended.kind : 'none', dmgA: dmg(x.attacker), dmgT: dmg(x.target) };
}
const med = (a) => { const s = [...a].sort((p, q) => p - q), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const f = (x, d = 1) => (x === null || x === undefined ? '-' : x.toFixed(d));

const shapeOf = (c) => shape(cell(c));
if (!isMainThread) {
  parentPort.on('message', (c) => parentPort.postMessage(c ? shapeOf(c) : null));
} else if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`# E7 pace (${pairs.map((p) => p.join(' v ')).join(', ')}), ranges ${ranges}, ${openings}, seeds ${seeds}, limit ${limit} s, overrides ${JSON.stringify(overrides)}, orders ${JSON.stringify(orders)}`);
  const cells = [];
  for (const [a, b] of pairs) for (const range of ranges) for (const opening of openings) for (const seed of seeds) cells.push({ a, b, range, opening, seed });
  const jobs = Math.max(1, Math.min(cells.length, Number(opt('--jobs', os.cpus().length))));
  const all = new Array(cells.length);
  if (jobs === 1) cells.forEach((c, i) => { all[i] = shapeOf(c); });
  else await new Promise((done, fail) => {
    let next = 0, left = cells.length;
    for (let w = 0; w < jobs; w++) {
      const worker = new Worker(new URL(import.meta.url), { workerData: { argv } });
      let mine = -1;
      const feed = () => { if (next < cells.length) { mine = next++; worker.postMessage(cells[mine]); } else worker.terminate(); };
      worker.on('message', (r) => { all[mine] = r; if (--left === 0) done(); feed(); });
      worker.on('error', fail);
      feed();
    }
  });
  all.forEach((s, i) => { const { a, b, range, opening, seed } = cells[i];
    console.log(`${a} v ${b.padEnd(7)} ${String(range).padStart(4)} ${opening.padEnd(9)} s${seed}: ${s.kind.padEnd(9)} ${String(s.side ?? '').padEnd(3)} t ${f(s.T).padStart(6)} s  win ${String(s.winner).padEnd(4)} hits A/T ${s.hitsA}/${s.hitsT} of ${s.shots}; first hit ${f(s.firstHit)} s, on loser ${s.loser ? `${f(s.firstShare, 2)} of the battle, ${s.loserHits} hits` : '-'}; end ${s.endEvent}; cells damaged A/T ${s.dmgA}/${s.dmgT}; outcome A/T ${s.outcome ? `${OUTCOME_LABEL[s.outcome.A]}/${OUTCOME_LABEL[s.outcome.T]}` : '-'}; first hot A/T ${f(s.hotA)}/${f(s.hotT)} s; quiet gap from 0 ${f(s.quiet0)} s, from the first damage ${f(s.quietDmg)} s`); });
  const ends = all.filter((s) => s.kind !== 'none' && s.kind !== 'error');
  console.log(`kernel errors: ${all.filter((s) => s.kind === 'error').length}`);
  const kinds = {}; for (const s of all) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
  console.log(`E7: median end ${f(med(ends.map((s) => s.T)))} s over ${ends.length} of ${all.length} ended (no end by ${limit} s counts as ${limit} s: median ${f(med(all.map((s) => s.T)))} s); ends ${JSON.stringify(kinds)}`);
  // #329: E7 counts only two-sided battles (both ships take cell damage); the loser's damage in cells, every channel.
  const two = all.filter((s) => s.dmgA > 0 && s.dmgT > 0), twoEnded = two.filter((s) => s.kind !== 'none' && s.kind !== 'error');
  const loserCells = (s) => (s.loser === 'A' ? s.dmgA : s.dmgT);
  console.log(`two-sided (E7, #329): ${two.length} of ${all.length} battles damage both ships; median end ${f(med(two.map((s) => s.T)))} s (no end counts as ${limit} s; ${two.length - twoEnded.length} without an end), ${f(med(twoEnded.map((s) => s.T)))} s over the ${twoEnded.length} ended; first hit on the loser ${f(med(twoEnded.filter((s) => s.firstShare !== null).map((s) => s.firstShare)), 2)} of the battle; rounds on the loser ${f(med(twoEnded.filter((s) => s.loser).map((s) => s.loserHits)), 0)}, its cells damaged ${f(med(twoEnded.filter((s) => s.loser).map(loserCells)), 0)}`);
  const dec = all.filter((s) => s.loser);
  console.log(`shape over ${dec.length} decided: first hit on the loser median ${f(med(dec.filter((s) => s.firstShare !== null).map((s) => s.firstShare)), 2)} of the battle; hits on the loser median ${f(med(dec.map((s) => s.loserHits)), 0)} (${dec.length ? Math.min(...dec.map((s) => s.loserHits)) : '-'}-${dec.length ? Math.max(...dec.map((s) => s.loserHits)) : '-'}); hit rate ${f((100 * all.reduce((n, s) => n + s.hitsA + s.hitsT, 0)) / Math.max(1, all.reduce((n, s) => n + s.shots, 0)), 0)} %`);
  // The tools pass (13n.11): the outcomes counted apart, survival per side, and per pair the first hot room and the quiet gaps.
  const ok = all.filter((s) => s.outcome);
  const count = (side) => OUTCOMES.map((k) => `${OUTCOME_LABEL[k]} ${ok.filter((s) => s.outcome[side] === k).length}`).join(', ');
  console.log(`outcomes A: ${count('A')}; survival ${ok.filter((s) => survives(s.outcome.A)).length} of ${ok.length}`);
  console.log(`outcomes T: ${count('T')}; survival ${ok.filter((s) => survives(s.outcome.T)).length} of ${ok.length}`);
  const fmin = (a) => (a.length ? Math.min(...a) : null), fmax = (a) => (a.length ? Math.max(...a) : null);
  for (const [a, b] of pairs) {
    const mine = all.filter((s, i) => cells[i].a === a && cells[i].b === b);
    const firstHot = mine.map((s) => [s.hotA, s.hotT].filter((t) => t !== null)).filter((h) => h.length).map((h) => Math.min(...h));
    const kills = mine.filter((s) => s.quiet0 !== null), q0 = kills.map((s) => s.quiet0), qd = kills.filter((s) => s.quietDmg !== null).map((s) => s.quietDmg);
    console.log(`pair ${a} v ${b}: first hot room (either side) median ${f(med(firstHot))} s, min ${f(fmin(firstHot))} s over ${firstHot.length} of ${mine.length} battles; quiet gap over ${kills.length} kills: from 0 max ${f(fmax(q0))} s, median ${f(med(q0))} s; from the first damage max ${f(fmax(qd))} s, median ${f(med(qd))} s`);
  }
}
