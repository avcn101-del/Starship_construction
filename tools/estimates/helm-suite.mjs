// tools/estimates/helm-suite.mjs — the helm behaviour suite (§17 item 55; the design partner's proposal, 2026-10-24):
// every candidate helm law is judged on the whole duel grid at once, so a fix for one symptom cannot hide a failure
// elsewhere. The grid: R2, Lance, Swarm and Furnace of mission0/builds.js, each mirror and each against R2, at 600 /
// 900 / 1500 / 2500 m (battle.cullDistance 5000 m at 2500, as #330), bow and broadside, with the default orders and
// with style strafe and orbit, both the standard enemy, seed 1. Per battle, four properties:
//   (1) separation: the main bodies' minimum separation >= 150 m (J1's floor, L4.helm.separation);
//   (2) no race: each main body's speed at the end <= 2 x the braking curve's speed from the larger of the opening range
//       and helm.rangeOpen plus helm.rangeBand (the fastest a range order can want; js/helm.js brakingSpeed, each ship's
//       acceleration at its preset's throttle and t180 at the start);
//   (3) bearing: each side with a spinal weapon (railgun or beam bay) has its axis within 2 degrees of the line of sight
//       for at least 10 % of the battle (sampled each second); a side with turrets or missiles only passes;
//   (4) end: a battle in which both ships took cell damage ends by 600 s.
// Run-time overrides only; changes nothing; never a canonical run (#241). Run it from the tree under test (copy it into
// a scratch tree's tools/estimates/ to judge a scratch law):
//   node tools/estimates/helm-suite.mjs [--pairs a:b,...] [--ranges m,...] [--openings bow,broadside]
//                                       [--styles default,strafe,orbit] [--limit s] [--jobs n] [--rows]
// --rows prints one line per battle; the table of failing counts per property is always printed.
import { PARAMS, withOverrides, scaled } from '../../js/data.js';
import { createBattle, tick, mainBody } from '../../js/battle.js';
import { shipDynamics, brakingSpeed, ordersOf } from '../../js/helm.js';
import { BUILDS } from '../../mission0/builds.js';
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

const argv = isMainThread ? process.argv.slice(2) : workerData.argv, opt = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
const list = (s) => s.split(',');
const pairs = list(opt('--pairs', 'R2:R2,Lance:Lance,Swarm:Swarm,Furnace:Furnace,Lance:R2,Swarm:R2,Furnace:R2')).map((x) => x.split(':'));
const ranges = list(opt('--ranges', '600,900,1500,2500')).map(Number), openings = list(opt('--openings', 'bow,broadside'));
const styles = list(opt('--styles', 'default,strafe,orbit')), limit = Number(opt('--limit', 600));
const STD = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };
const SEP = 150, BEAR = (2 * Math.PI) / 180, SHARE = 0.1;
const wrap = (a) => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));

/** One battle of the grid and its four properties. */
function cell({ a, b, range, opening, style }) {
  const params = withOverrides(range > 1500 ? { 'battle.cullDistance': 5000 } : {}), broadside = opening === 'broadside';
  const x = createBattle({ params, attacker: BUILDS[a], target: BUILDS[b], distance: range, seed: 1, knowledge: true,
    bearing: broadside ? '+y' : '+x', ...(broadside ? { attackerHeading: 0 } : {}), enemy: { A: STD, T: STD } });
  const set = style === 'default' ? {} : { style };
  for (const s of [x.attacker, x.target]) s.helm.override = { ...s.helm.override, ...set };
  const band = scaled(params.helm.rangeBand, x.edge), far = Math.max(range, scaled(params.helm.rangeOpen, x.edge)) + band;
  const cap = [x.attacker, x.target].map((s) => { const d = shipDynamics(x, s), o = { ...ordersOf(s.helm.orders), ...(s.helm.override || {}) }; return 2 * brakingSpeed(far, d.a * o.throttle, d.t180); });
  const spinal = [x.attacker, x.target].map((s) => s.world.rooms.some((r) => r.placed && (r.type === 'railgun' || r.type === 'beamBay')));
  let minSep = Infinity, samples = 0, error = null;
  const bearing = [0, 0], steps = Math.round(limit / x.dt), perSecond = Math.round(1 / x.dt);
  try {
    while (!x.ended && x.step < steps) {
      tick(x);
      const A = mainBody(x.attacker), T = mainBody(x.target);
      if (!A || !T) continue;
      const d = [T.x[0] - A.x[0], T.x[1] - A.x[1]], r = Math.hypot(d[0], d[1]);
      minSep = Math.min(minSep, r);
      if (x.step % perSecond === 0) {
        samples++;
        const los = Math.atan2(d[1], d[0]);
        if (Math.abs(wrap(A.theta - los)) <= BEAR) bearing[0]++;
        if (Math.abs(wrap(T.theta - los - Math.PI)) <= BEAR) bearing[1]++;
      }
    }
  } catch (e) { error = `step ${x.step}: ${e.message}`; }
  const speed = [x.attacker, x.target].map((s) => { const B = mainBody(s); return B ? Math.hypot(B.v[0], B.v[1]) : 0; });
  const dmg = (s) => { const L = s.world.log; return (L.events ?? L).filter((e) => e.type === 'cell-damaged').length; };
  const dmgA = dmg(x.attacker), dmgT = dmg(x.target), share = bearing.map((n) => (samples ? n / samples : 0));
  return {
    t: x.t, end: x.ended ? x.ended.kind : 'none', error, minSep, speed, cap, share, spinal, dmgA, dmgT,
    fail: {
      separation: minSep < SEP,
      race: speed.some((v, i) => v > cap[i]),
      bearing: share.some((s, i) => spinal[i] && s < SHARE),
      end: dmgA > 0 && dmgT > 0 && !x.ended,
      error: !!error,
    },
  };
}

if (!isMainThread) {
  parentPort.on('message', (c) => parentPort.postMessage(c ? cell(c) : null));
} else if (import.meta.url === `file://${process.argv[1]}`) {
  const cells = [];
  for (const [a, b] of pairs) for (const range of ranges) for (const opening of openings) for (const style of styles) cells.push({ a, b, range, opening, style });
  const jobs = Math.max(1, Math.min(cells.length, Number(opt('--jobs', os.cpus().length))));
  const all = new Array(cells.length);
  if (jobs === 1) cells.forEach((c, i) => { all[i] = cell(c); });
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
  console.log(`# helm suite: ${cells.length} battles (${pairs.map((p) => p.join(':'))} x ${ranges} m x ${openings} x ${styles}), limit ${limit} s; separation >= ${SEP} m, speed <= 2 x the braking curve's, spinal bearing >= ${SHARE * 100} % within 2 deg, two-sided battles end`);
  const keys = ['separation', 'race', 'bearing', 'end', 'error'];
  const f0 = (v) => v.toFixed(0);
  all.forEach((r, i) => {
    const c = cells[i], bad = keys.filter((k) => r.fail[k]);
    if (argv.includes('--rows') || bad.length) console.log(`${bad.length ? 'FAIL' : 'ok  '} ${c.a}:${c.b} ${c.range} ${c.opening} ${c.style}: ${r.end} t ${f0(r.t)} s; min sep ${f0(r.minSep)} m; speed ${r.speed.map(f0)} (cap ${r.cap.map(f0)}) m/s; bearing ${r.share.map((s, j) => (r.spinal[j] ? `${f0(100 * s)} %` : '-'))}; cells damaged ${r.dmgA}/${r.dmgT}${bad.length ? `; fails ${bad}` : ''}${r.error ? `; ${r.error}` : ''}`);
  });
  console.log(`failing cells: ${keys.map((k) => `${k} ${all.filter((r) => r.fail[k]).length}`).join(', ')}; any ${all.filter((r) => keys.some((k) => r.fail[k])).length} of ${all.length}`);
  for (const [a, b] of pairs) {
    const mine = all.filter((r, i) => cells[i].a === a && cells[i].b === b);
    console.log(`  ${a}:${b}: ${keys.map((k) => `${k} ${mine.filter((r) => r.fail[k]).length}`).join(', ')} of ${mine.length}`);
  }
}
