import { createBattle, tick } from '../../../js/battle.js';
import { SENSOR_SHIPS } from '../../targets.js';

// The plume's occlusion (the lead designer's answer 3 on PR #101, the fix round of L5e1; DESIGN.md 13n.8, 13n.1 (e),
// #297): a fitting reaches the plume only if the segment from the plume's apex to it crosses no standing cell of its
// own ship. A fitting behind its own hull does not burn ("nothing absurd").
//
// Setup (T1), as L4.engine.plume: createBattle, knowledge off; the leader R1d-A (T, heading 0) and the pursuer R1d-A
// (A, static, holding heading 0) straight behind it, its centre of mass 900 m behind the leader's, both at throttle 1
// from undock (both accelerate alike); the leader's apex at its grid's (0, 15) m, its jet along -x; in the pursuer's
// grid the apex sits at (900, 15), a fitting at grid (x_f, y_f) at d = 900 - x_f along the axis, |y_f - 15| across it.
// Near side: the bow panels (the beam bay's (10, 2) +x and (10, 3) +x, x_f = 55 m) face the jet. Far side: the four
// panels on the -x faces of the heat sink ((3, 4) and (3, 5)) and of the shield generator ((3, 0) and (3, 1)), x_f =
// 15 m, face away from it: the segment from the apex to each runs through its own room's cell (and on, toward the
// bow, through others). 120 steps (2 s).
// Hand-worked (13n.8 (2)): P = 1.5e7 x 1e4 / 2 = 7.5e10 W; a panel (250 kg, 0.75 MJ) at d is ruined at step
// ceil(20.3575 x (d / 900)^2). Near side, d = 845 m: radius 845 tan 30 = 487.86 m, 100 304 W/m^2, 2.5076e6 W on 25
// m^2: 0.29909 s = 20.3575 x 0.881512 = 17.95 steps, ruined at step 18 (one-sided [t, t + dt)). Far side, d = 885 m,
// at most 12.5 m off the axis against a radius of 510.96 m: inside the cone, so without occlusion each would be ruined
// at step ceil(20.3575 x 0.966944) = ceil(19.68) = 20, inside the run; with it each takes 0 J over the 120 steps and
// keeps full integrity (not ruined). The checks are on the four by name, not on a re-statement of the kernel.
const SHIP = SENSOR_SHIPS['R1d-A'];
const D = 900;
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const midpoint = (cell, side, e) => [(cell[0] + 0.5 + side[0] / 2) * e, (cell[1] + 0.5 + side[1] / 2) * e];
const find = (room, cell, side) => SHIP.fittings.findIndex(([t, r, c, s]) => t === 'radiator' && r === room && c[0] === cell[0] && c[1] === cell[1] && s[0] === side[0] && s[1] === side[1]);

export default {
  id: 'L4.engine.plume.shadow',
  level: 'L4',
  laws: ['occlusion: a fitting reaches the plume only if the segment from the apex to it crosses no standing cell of its own ship (the lead designer\'s answer 3 on PR #101; the plume of #297, #304, 13n.8)'],
  dependsOn: ['L4.helm.drift.v2'],
  setup: 'T1: createBattle, knowledge off; the leader R1d-A (heading 0) and the pursuer R1d-A (static, holding heading 0) straight behind it, its centre 900 m behind, both at throttle 1; 120 steps (the fix round of L5e1)',
  measure: 'the step each of the pursuer\'s fittings is ruined (fitting-ruined events); the energy each of the four far-side panels took; the pursuer\'s headings',
  tolerance: 'steps exact, one-sided: ruined at n = ceil(q m / (I A dt)); far side exactly 0 J',
  criterion: 'the two near-side bow panels ruined at step 18, the hand-worked literal; the four far-side panels (inside the cone, their unshadowed step 20 within the run) take 0 J and are not ruined; both hold heading 0 within 1e-5 rad',
  tunable: ['engine.plumeHalfAngle', 'engine.thrust', 'engine.exhaustVelocity', 'matter.burnEnergyPerKg', 'radiator.mass'],
  locked: { date: '2026-10-24', hash: 'b638899b' },
  cases() {
    return [{ name: 'straight behind at 900 m' }];
  },
  expected(ctx) {
    const p = ctx.params, e = 5, dt = ctx.dt, theta = (p.engine.plumeHalfAngle.value * Math.PI) / 180;
    const P = (p.engine.thrust.value * p.engine.exhaustVelocity.value) / 2, need = p.matter.burnEnergyPerKg.value * p.radiator.mass.value;
    const at = (id) => { const f = SHIP.fittings[id], [x, y] = midpoint(f[2], f[3], e), d = D - x, R = d * Math.tan(theta); return { d, lat: Math.abs(y - 15), R, n: need / ((P / (Math.PI * R * R)) * e * e * dt) }; };
    const near = [find('beamBay', [10, 2], [1, 0]), find('beamBay', [10, 3], [1, 0])];
    const far = [find('heatSink', [3, 4], [-1, 0]), find('heatSink', [3, 5], [-1, 0]), find('shield', [3, 0], [-1, 0]), find('shield', [3, 1], [-1, 0])];
    return { near, far, literal: 18, unshadowed: 20, geometry: Object.fromEntries([...near, ...far].map((id) => [id, at(id)])) };
  },
  run(ctx) {
    const open = (w) => { for (const r of w.rooms) if (r.type === 'engine') r.engine.throttle = 1; };
    const b = createBattle({ params: ctx.params, tier: 'T1', attacker: SHIP, target: SHIP, bearing: [-1, 0], distance: D, attackerHeading: 0, setup: { attacker: open, target: open } });
    while (b.step < 120 && !b.ended) tick(b);
    const A = b.attacker.world;
    const ruined = Object.fromEntries(A.log.events.filter((x) => x.type === 'fitting-ruined').map((x) => [x.fitting, Math.round(x.t / ctx.dt)]));
    const burned = Object.fromEntries(A.fittings.filter((f) => f.type === 'radiator').map((f) => [f.id, f.burned || 0]));
    return { ruined, burned, heading: [A.ship.bodies[0].theta, b.target.world.ship.bodies[0].theta], steps: b.step };
  },
  compare(e, a) {
    const g = e.geometry;
    const checks = {
      'the indices: two near-side and four far-side panels found': e.near.every((i) => i >= 0) && e.far.every((i) => i >= 0),
      'the literal: each near-side bow panel ruined at step 18 (its formula step)': e.near.every((id) => Math.ceil(g[id].n) === e.literal && a.ruined[id] === e.literal),
      'the far side inside the cone, its unshadowed step 20 within the run': e.far.every((id) => g[id].lat < g[id].R && Math.ceil(g[id].n) === e.unshadowed && e.unshadowed <= 120),
      'the far side takes 0 J and keeps full integrity': e.far.every((id) => a.burned[id] === 0 && !(id in a.ruined)),
      'both hold heading 0 within 1e-5 rad': a.heading.every((x) => Math.abs(x) <= 1e-5) && a.steps === 120,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    return { expected: `near ${e.near.map((id) => `#${id}@${e.literal}`).join(' ')}; far ${e.far.map((id) => `#${id} 0 J`).join(' ')} (unshadowed: step ${e.unshadowed})`, actual: `ruined ${Object.entries(a.ruined).map(([id, n]) => `#${id}@${n}`).join(' ') || 'none'}; far ${e.far.map((id) => `#${id} ${a.burned[id]} J`).join(' ')}; headings ${a.heading.join(', ')}` };
  },
};
