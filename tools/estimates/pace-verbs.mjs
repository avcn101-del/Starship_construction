// tools/estimates/pace-verbs.mjs — the lead designer's pace study after L5e1 (#319): verb leverage, the share of
// battles one player verb flips, and the decisions available per battle (the moments at which some verb changes
// the result). Side A is the player (R2 flying the preset Fire with the verb as its one input, as tools/duel.js),
// side T the standard enemy on a reference build, on the locked builds of mission0/builds.js. The verbs: each preset,
// a scan of each zone, a target on each of the other build's rooms. Run-time overrides only; never a canonical run:
//   node tools/estimates/pace-verbs.mjs [--builds a,...] [--ranges m,...] [--openings bow,broadside] [--seed n]
//                                       [--pairs player:enemy,...] [--times s,... | --every s [--max-moments n]] [--limit s]
//                                       [--jobs n] [--cull2] [--set group.name=value ...]
// --pairs names the player's build and the enemy's (default R2 against each of --builds); --jobs the worker threads
// (default one per core; the output does not depend on it).
// --times lists the verb's moments (default 0); --every s tries every multiple of s before the baseline's end, at most
// --max-moments of them (default 12).
// A result is the winner (A, T, draw or none); a verb flips a battle when its winner differs from the baseline's.
import { PARAMS, withOverrides, PRESETS } from '../../js/data.js';
import { createBattle, runBattle, battleHash } from '../../js/battle.js';
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { BUILDS, REFERENCE } from '../../mission0/builds.js';

const argv = isMainThread ? process.argv.slice(2) : workerData.argv, opt = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
const list = (s) => s.split(',');
const ranges = list(opt('--ranges', '600,900,1500')).map(Number), openings = list(opt('--openings', 'bow,broadside'));
const seed = Number(opt('--seed', 1)), limit = Number(opt('--limit', 600)), builds = list(opt('--builds', Object.keys(REFERENCE).join(',')));
const every = opt('--every', null), maxMoments = Number(opt('--max-moments', 12)), times = every ? null : list(opt('--times', '0')).map(Number);
const overrides = {};
for (let i = 0; i < argv.length; i++) if (argv[i] === '--set') { const [k, v] = argv[++i].split('='); overrides[k] = Number(v); }
if (argv.includes('--cull2')) overrides['battle.cullDistance'] = 2 * Math.max(...ranges);
for (const [k, v] of Object.entries(overrides)) { const [g, n] = k.split('.'), p = PARAMS[g][n]; if (!(v >= p.min && v <= p.max)) throw new Error(`${k}=${v} outside ${p.min}..${p.max}`); }
for (const r of ranges) { const p = PARAMS.battle.openingRange; if (!(r >= p.min && r <= p.max)) throw new Error(`range ${r} outside battle.openingRange's ${p.min}..${p.max}`); }
const params = withOverrides(overrides), STD = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };

/** A battle's result as tools/sweep.mjs's resultOf (copied: importing sweep.mjs in a worker starts its own worker loop). */
function resultOf(b) {
  const e = b.ended;
  const winner = !e ? null : e.kind === 'draw' ? 'draw' : e.kind === 'escaped' ? (e.side === 'A' ? 'T' : 'A') : e.side === 'A' ? 'T' : 'A';
  return { winner, kind: e ? e.kind : 'none', side: e ? e.side : null, t: e ? e.t : null, step: e ? e.step : b.step, hash: battleHash(b) };
}
const pairs = opt('--pairs', null) ? list(opt('--pairs')).map((x) => x.split(':')) : builds.map((b) => ['R2', b]);
/** One battle: the player (side A, on Fire, the verb its one input) against the standard enemy. */
function duel({ a, b, range, opening, inputs }) {
  const broadside = opening === 'broadside';
  const x = createBattle({ params, attacker: BUILDS[a], target: BUILDS[b], distance: range, seed, knowledge: true,
    bearing: broadside ? '+y' : '+x', ...(broadside ? { attackerHeading: 0 } : {}), orders: { A: 'fire' }, enemy: { T: STD },
    inputs: inputs.map((y) => ({ ...y, side: 'A' })) });
  // A kernel throw is reported as a result of its own (the pace study found one in beamsOut, #327), never hidden.
  try { return resultOf(runBattle(x, limit)); } catch (e) { return { winner: 'error', kind: 'error', t: x.t, error: `${a} v ${b} ${range} ${opening} ${JSON.stringify(inputs)}: step ${x.step}: ${e.message}` }; }
}
/** Run every battle, in this thread or across --jobs workers; results in order. */
async function runAll(battles) {
  const jobs = Math.max(1, Math.min(battles.length, Number(opt('--jobs', os.cpus().length))));
  const out = new Array(battles.length);
  if (jobs === 1) { battles.forEach((c, i) => { out[i] = duel(c); }); return out; }
  await new Promise((done, fail) => {
    let next = 0, left = battles.length;
    for (let w = 0; w < jobs; w++) {
      const worker = new Worker(new URL(import.meta.url), { workerData: { argv } });
      let mine = -1;
      const feed = () => { if (next < battles.length) { mine = next++; worker.postMessage(battles[mine]); } else worker.terminate(); };
      worker.on('message', (r) => { out[mine] = r; if (--left === 0) done(); feed(); });
      worker.on('error', fail);
      feed();
    }
  });
  return out;
}
const verbs = (b) => [...Object.keys(PRESETS).map((p) => ['preset', p]), ...[0, 1, 2, 3, 4, 5].map((z) => ['scan', z]), ...BUILDS[b].rooms.map((r) => ['target', r.id])];
const tag = (r) => `${r.winner ?? 'none'}${r.t === null ? '' : ` ${r.t.toFixed(1)} s`}`;

if (!isMainThread) parentPort.on('message', (c) => parentPort.postMessage(duel(c)));
else {
  const keys = [];
  for (const [a, b] of pairs) for (const range of ranges) for (const opening of openings) keys.push({ a, b, range, opening });
  const bases = await runAll(keys.map((k) => ({ ...k, inputs: [] })));
  const battles = [], where = [];
  keys.forEach((k, ci) => {
    const end = bases[ci].t ?? limit;
    const ts = times || Array.from({ length: Math.min(maxMoments, Math.ceil(end / Number(every))) }, (_, i) => i * Number(every));
    k.ts = ts;
    for (const t of ts) for (const [verb, arg] of verbs(k.b)) { battles.push({ ...k, inputs: [{ t, verb, arg }] }); where.push({ ci, t, verb, arg }); }
  });
  const results = await runAll(battles);
  const errors = [...bases, ...results].filter((r) => r.winner === 'error').map((r) => r.error);
  const score = (w) => (w === 'A' ? 1 : w === 'draw' ? 0.5 : 0);
  let cells = 0, flipped = 0, helped = 0, hurt = 0, moments = 0, live = 0;
  const best = {}, perCell = keys.map(() => ({ flips: 0, lines: [], moments: new Map() }));
  results.forEach((r, i) => {
    const { ci, t, verb, arg } = where[i], base = bases[ci], c = perCell[ci];
    if (!c.moments.has(t)) c.moments.set(t, 0);
    if (r.winner === 'error') return; // counted under kernel errors, not as a flip
    cells++;
    if (r.winner !== base.winner) {
      flipped++; c.flips++; c.moments.set(t, c.moments.get(t) + 1);
      const d = score(r.winner) - score(base.winner);
      if (d > 0) { helped++; best[`${verb} ${arg}`] = (best[`${verb} ${arg}`] || 0) + 1; } else if (d < 0) hurt++;
      c.lines.push(`    t ${t} ${verb} ${arg}: ${tag(r)}`);
    }
  });
  console.log(`# verb leverage (the player on Fire, against the standard enemy), seed ${seed}, limit ${limit} s, overrides ${JSON.stringify(overrides)}`);
  keys.forEach((k, ci) => {
    const c = perCell[ci];
    for (const n of c.moments.values()) { moments++; if (n) live++; }
    console.log(`${k.a} v ${k.b.padEnd(7)} ${String(k.range).padStart(4)} ${k.opening.padEnd(9)}: baseline ${tag(bases[ci])}; ${c.flips} flips over ${k.ts.length} moment(s) x ${verbs(k.b).length} verbs`);
    for (const l of c.lines) console.log(l);
  });
  const baseWins = bases.filter((r) => r.winner === 'A').length;
  console.log(`baselines: the player wins ${baseWins} of ${bases.length}`);
  console.log(`verb leverage: ${flipped} of ${cells} single-verb battles flip the result (${((100 * flipped) / Math.max(1, cells)).toFixed(1)} %): ${helped} toward the player, ${hurt} against; moments with a flip ${live} of ${moments}`);
  console.log(`verbs that turn a result toward the player: ${JSON.stringify(best)}`);
  console.log(`kernel errors: ${errors.length}`); for (const e of errors) console.log(`  ERROR ${e}`);
}
