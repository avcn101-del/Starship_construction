// tools/estimates/item58.mjs — §17 item 58's probe (the lead designer, 2026-10-24): does a starved engine latch the
// pilot's reported thrust at 0 in real battles? On the helm suite's grid (tools/estimates/helm-suite.mjs: the four
// reference builds, mirrors and against R2, 600 / 900 / 1500 / 2500 m, bow and broadside, default / strafe / orbit, the
// standard enemy, seed 1), per side and each whole second: latched = the side has a main body, its orders' throttle is
// above 0, every live engine reports a delivered fraction of 0 (js/pilot.js lastSupply) and is not asked to thrust
// (throttle 0), and its reactors have spare power (capacity minus routed) of at least a tenth of one engine's draw:
// the router could feed it, the pilot does not ask. Reports per battle the latched seconds and the longest run, and
// the totals. Run-time overrides only; changes nothing; never a canonical run (#241). Run it from the tree under test:
//   node tools/estimates/item58.mjs [--pairs a:b,...] [--ranges m,...] [--openings ...] [--styles ...] [--limit s] [--jobs n]
import { withOverrides, scaled } from '../../js/data.js';
import { createBattle, tick, mainBody } from '../../js/battle.js';
import { BUILDS } from '../../mission0/builds.js';
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

const argv = isMainThread ? process.argv.slice(2) : workerData.argv, opt = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
const list = (s) => s.split(',');
const pairs = list(opt('--pairs', 'R2:R2,Lance:Lance,Swarm:Swarm,Furnace:Furnace,Lance:R2,Swarm:R2,Furnace:R2')).map((x) => x.split(':'));
const ranges = list(opt('--ranges', '600,900,1500,2500')).map(Number), openings = list(opt('--openings', 'bow,broadside'));
const styles = list(opt('--styles', 'default,strafe,orbit')), limit = Number(opt('--limit', 600));
const STD = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };

function latched(x, s) {
  if (!mainBody(s)) return false;
  const w = s.world, o = { ...s.helm.orders, ...(s.helm.override || {}) };
  const engines = w.rooms.filter((r) => r.type === 'engine' && r.placed && !r.exploded && r.engine);
  if (!w.power || !(o.throttle > 0) || !engines.length) return false;
  if (!engines.every((r) => r.engine.lastSupply === 0 && !(r.engine.throttle > 0))) return false;
  const reactors = w.rooms.filter((r) => r.type === 'reactor' && r.placed);
  const capacity = reactors.reduce((n, r) => n + (r.active ? r.reactor.demand * scaled(x.params.reactor.power, x.edge) : 0), 0);
  const routed = reactors.reduce((n, r) => n + (r.reactor.routed ?? 0), 0);
  return capacity - routed >= 0.1 * scaled(x.params.engine.powerDraw, x.edge);
}

function cell({ a, b, range, opening, style }) {
  const params = withOverrides(range > 1500 ? { 'battle.cullDistance': 5000 } : {}), broadside = opening === 'broadside';
  const x = createBattle({ params, attacker: BUILDS[a], target: BUILDS[b], distance: range, seed: 1, knowledge: true,
    bearing: broadside ? '+y' : '+x', ...(broadside ? { attackerHeading: 0 } : {}), enemy: { A: STD, T: STD } });
  const set = style === 'default' ? {} : { style };
  for (const s of [x.attacker, x.target]) s.helm.override = { ...s.helm.override, ...set };
  const sec = [0, 0], run = [0, 0], longest = [0, 0], steps = Math.round(limit / x.dt), perSecond = Math.round(1 / x.dt);
  let error = null;
  try {
    while (!x.ended && x.step < steps) {
      tick(x);
      if (x.step % perSecond) continue;
      [x.attacker, x.target].forEach((s, i) => {
        if (latched(x, s)) { sec[i]++; run[i]++; longest[i] = Math.max(longest[i], run[i]); } else run[i] = 0;
      });
    }
  } catch (e) { error = `step ${x.step}: ${e.message}`; }
  return { t: x.t, end: x.ended ? x.ended.kind : 'none', sec, longest, error };
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
  console.log(`# item 58 probe: ${cells.length} battles, limit ${limit} s; latched seconds (A/T) and the longest run`);
  all.forEach((r, i) => {
    const c = cells[i];
    if (r.sec[0] || r.sec[1] || r.error) console.log(`LATCH ${c.a}:${c.b} ${c.range} ${c.opening} ${c.style}: ${r.end} t ${r.t.toFixed(0)} s; latched ${r.sec.join('/')} s, longest ${r.longest.join('/')} s${r.error ? `; ${r.error}` : ''}`);
  });
  const hit = all.filter((r) => r.sec[0] || r.sec[1]).length, five = all.filter((r) => Math.max(...r.longest) >= 5).length;
  console.log(`battles with any latched second: ${hit} of ${all.length}; with a run of 5 s or more: ${five}; errors ${all.filter((r) => r.error).length}`);
}
