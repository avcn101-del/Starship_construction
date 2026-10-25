// Battle phases' gap 1 (#346): A under `close` pursues T under `disengage`, standing orders only, 900 m bow-on, seed 1, to 600 s.
// Run from the repository root: node tools/estimates/phase-gaps-pursuit.mjs <A> <T> <live|tight>  (builds by export name: R2 LANCE SWARM FURNACE)
// The candidates: apply phase-gaps-pursuit.diff to a scratch copy of js/ and run there with LEAD=1, 2 or 5 (an estimate, never canonical).
globalThis.__LEAD = +(process.env.LEAD || 0);
// gap 1 probe: A under `close` pursues T under `disengage`; standing orders only, 900 m bow-on, seed 1, to 600 s.
const R = (p) => import(new URL(p, `file://${process.cwd()}/`));
const [{ withOverrides }, { createBattle, tick, mainBody }, { shipDynamics }, B] = await Promise.all(['js/data.js', 'js/battle.js', 'js/helm.js', 'mission0/builds.js'].map(R));
const [an, tn, live, ov] = process.argv.slice(2);
const params = withOverrides(ov ? JSON.parse(ov) : {});
const b = createBattle({ params, attacker: B[an], target: B[tn], bearing: '+x', distance: 900, seed: 1, knowledge: true,
  orders: { A: { range: 'close', throttle: 1 }, T: { range: 'disengage', throttle: 1 } } });
if (live === 'tight') for (const s of b.sides) s.helm.hold = true;
const pos = () => b.sides.map((s) => mainBody(s));
const d = () => { const [p, q] = pos(); if (!p || !q) return -1; return Math.hypot(p.x[0] - q.x[0], p.x[1] - q.x[1]); };
let full = 0, n = 0, engaged = 0; const tr = [];
while (!b.ended && b.t < 600) {
  tick(b); n++;
  const A = b.sides[0]; if (A.helm.throttle > 0.99) full++; if (A.helm.engaged) engaged++;
  if (b.step % 1800 === 0) { const [p, q] = pos(); const D = [q.x[0] - p.x[0], q.x[1] - p.x[1]], r = Math.hypot(...D); const rd = ((q.v[0] - p.v[0]) * D[0] + (q.v[1] - p.v[1]) * D[1]) / r;
    tr.push(`${b.t.toFixed(0)}:${r.toFixed(0)}/${rd.toFixed(1)}/${b.sides.map((s) => (shipDynamics(b, s).a / 9.80665).toFixed(2)).join(',')}`); }
}
console.log(JSON.stringify({ L: globalThis.__LEAD, an, tn, live, end: b.ended ? `${b.ended.kind} ${b.ended.side} ${b.ended.t.toFixed(1)}` : 'none', d: +d().toFixed(0), fullA: +(full / n).toFixed(2), engagedA: +(engaged / n).toFixed(2), tr: tr.join(' ') }));
