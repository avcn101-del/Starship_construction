#!/usr/bin/env node
// proto/measure.mjs — duels of the feel prototype headless (Node, no DOM) on
// the kernel's loop (proto/duel.js createDuel: both ships R1d-A, the player A
// on Fire with the given inputs, the enemy T by js/enemy.js at 0.5 each), for
// a range of seeds. Prints per duel the end, each side's shots, hits and
// misses, and, for the rounds that hit, the time of flight and how far the
// target's centre of mass moved across the line of sight during it beyond the
// constant-velocity lead (its acceleration's part, which the lead does not
// know), against the target hull's half-extent across the line of sight.
// Reads the true state: a tool for the owner, not the page, and not a Mission 0
// scenario (#217).
//
//   node proto/measure.mjs [--seeds N] [--first S] [--limit s] [--inputs <json>]
//
// --inputs a JSON list [{ t, verb, arg }] as tools/duel.js takes (default none:
// Fire's defaults); e.g. --inputs '[{"t":0,"verb":"preset","arg":"evade"}]'.
import { tick } from '../js/battle.js';
import { stepsAtLeast } from '../js/util.js';
import { createDuel, endLine } from './duel.js';
import { shotStats } from './battle.js';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const seeds = Number(arg('--seeds', 10)), first = Number(arg('--first', 1)), limit = Number(arg('--limit', 300));
const inputs = JSON.parse(arg('--inputs', '[]'));
const main = (s) => s.world.ship.bodies.find((b) => b.id === 'body-0') || [...s.world.ship.bodies].sort((a, b) => b.M - a.M)[0] || null;
const f = (x, n = 2) => (x === null || x === undefined || !Number.isFinite(x) ? '-' : x.toFixed(n));

console.log(`inputs ${JSON.stringify(inputs)}; limit ${limit} s`);
console.log('| seed | end | A shots / hits / misses | T shots / hits / misses | t_f min-max (s) | drift of A under T rounds, max (m) | drift of T under A rounds, max (m) | half-extent across LOS min (m) |');
console.log('|---|---|---|---|---|---|---|---|');
for (let seed = first; seed < first + seeds; seed++) {
  const b = createDuel({ seed, inputs }), steps = stepsAtLeast(limit, b.dt);
  const hist = new Map(), launched = new Map(); // step -> { A, T: { x, v } }; shot id -> { step, shooter, target }
  const snap = () => hist.set(b.step, Object.fromEntries(b.sides.map((s) => { const m = main(s); return [s.name, m ? { x: [...m.x], v: [...m.v], c: [...m.c], theta: m.theta, s } : null]; })));
  snap();
  while (!b.ended && b.step < steps) {
    tick(b);
    snap();
    for (const r of b.rounds) if (!launched.has(r.id)) launched.set(r.id, { step: b.step, shooter: r.shooter.name, target: r.other.name });
  }
  const tf = [], drift = { A: [], T: [] }, extent = [];
  for (const h of b.hits) {
    const L = launched.get(h.id);
    if (!L) continue;
    const s1 = Math.round(h.t / b.dt), h0 = hist.get(L.step), h1 = hist.get(s1);
    if (!h0 || !h1 || !h0[L.target] || !h1[L.target] || !h0[L.shooter]) continue;
    const T0 = h0[L.target], T1 = h1[L.target], S0 = h0[L.shooter], dt = (s1 - L.step) * b.dt;
    const d = [T0.x[0] - S0.x[0], T0.x[1] - S0.x[1]], r = Math.hypot(d[0], d[1]), n = [-d[1] / r, d[0] / r];
    const disp = [T1.x[0] - T0.x[0] - T0.v[0] * dt, T1.x[1] - T0.x[1] - T0.v[1] * dt];
    tf.push(dt); drift[L.target].push(Math.abs(disp[0] * n[0] + disp[1] * n[1]));
    // The target hull's half-extent across the line of sight at launch: its cells' centres projected on n, plus half a cell.
    const w = T0.s.world, body = T0, e = w.edge, proj = [];
    for (const room of w.rooms) w.layout.rooms.get(room.id).cells.forEach(([i, j]) => {
      const p = [(i + 0.5) * e - body.c[0], (j + 0.5) * e - body.c[1]], c = Math.cos(T0.theta), sn = Math.sin(T0.theta);
      proj.push((c * p[0] - sn * p[1]) * n[0] + (sn * p[0] + c * p[1]) * n[1]);
    });
    extent.push((Math.max(...proj) - Math.min(...proj)) / 2 + e / 2);
  }
  const st = shotStats(b), mx = (a) => (a.length ? Math.max(...a) : null), mn = (a) => (a.length ? Math.min(...a) : null);
  console.log(`| ${seed} | ${endLine(b)} | ${st.A.shots} / ${st.A.hits} / ${st.A.misses} | ${st.T.shots} / ${st.T.hits} / ${st.T.misses} | ${f(mn(tf))}-${f(mx(tf))} | ${f(mx(drift.A))} | ${f(mx(drift.T))} | ${f(mn(extent))} |`);
}
