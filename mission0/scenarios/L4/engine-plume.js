import { createBattle, tick } from '../../../js/battle.js';
import { pdAble } from '../../../js/rooms.js';
import { setScan, sourcesOf } from '../../../js/sensors.js';
import { SENSOR_SHIPS } from '../../targets.js';

// J3 of L5e1 (DESIGN.md 13n.8, 13n.1 (e) "The engine's plume", #297, #304, #316): behind each live engine at throttle a
// cone of half-angle engine.plumeHalfAngle (30 deg) carries the jet's power P = thrust x engine.exhaustVelocity / 2 (75
// GW at full thrust) at P / (pi (d tan theta)^2) at the distance d along its axis; a radiator panel, antenna or
// point-defence fitting of the other ship inside it takes that over one hull segment's face, edge^2 (25 m^2 at T1), and
// is ruined at matter.burnEnergyPerKg x its mass; never a hull cell (mechanism C).
//
// Setup (T1): createBattle, knowledge off; the leader R1d-A (T, heading 0, holding it on its RCS) and the pursuer R1d-A
// (A, a static side holding heading 0, attackerHeading) behind it, both engines at throttle 1 from undock (a case's
// input), so both accelerate alike and the geometry holds: the leader's exhaust apex is its grid's (0, 15) m, its jet
// along -x; a pursuer's fitting at grid (x_f, y_f) lies d = D - x_f behind the apex along the axis and |L + y_f - 15|
// across it, D and L the pursuer's centre of mass behind and beside the leader's (identical ships: the centres drop
// out). Cases: (panels) D = 955 m, L = 0: the pursuer's bow panels (the beam bay's (10, 2) +x and (10, 3) +x at x_f =
// 55 m) 900 m behind the apex on the axis, the third (9, 2) -y at 907.5 m; (antenna) D = 942.5 m: the hold's antenna
// (x_f = 42.5 m) 900 m behind on the axis; (offset) D = 900 m, L = 535 m: the pursuer's near hull side (y_f = 0) 520 m
// off the axis, every fitting at most 900 m behind (x_f >= 0), where the cone's radius is at most 900 tan 30 = 519.6 m.
// 120 steps (2 s).
// Hand-worked (13n.8 (2), tools/estimates/l5e1.mjs): P = 1.5e7 x 1e4 / 2 = 7.5e10 W; at 900 m the radius 900 tan 30 deg
// = 519.615 m, I = P / (pi 519.615^2) = 88 419.4 W/m^2, 2.21049e6 W on 25 m^2; a panel (250 kg) takes 3000 x 250 =
// 0.75 MJ: 0.33929 s = 20.36 steps, ruined at step 21; the antenna (1000 kg) 3 MJ: 1.35716 s = 81.43 steps, step 82;
// the third bow panel at 907.5 m: 0.33929 x (907.5 / 900)^2 = 0.34497 s = 20.70 steps, step 21. Every other fitting
// inside a cone is ruined at its own step by the same formula at its own d (a re-statement, computed here; none lands
// within 1e-6 of a whole step); one outside never. Offset: nothing. A ruined panel radiates nothing (its room's count
// drops, it is no source), a ruined antenna does not scan; no hull cell or plate of either ship changes, and the
// leader's fittings never burn (the pursuer's own jet points away). The thrust acts at the exhaust, off the centre of
// mass, and the RCS hold the heading: both ships turn alike by at most 1e-5 rad over the 2 s (checked), which moves
// a fitting 955 m behind by under 1 cm, against windows of metres in d.
const SHIP = SENSOR_SHIPS['R1d-A'];
const CASES = { panels: { D: 955, L: 0 }, antenna: { D: 942.5, L: 0 }, offset: { D: 900, L: 535 } };
const BURNS = new Set(['radiator', 'antenna', 'pd', 'pdLaser']);
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const midpoint = (cell, side, e) => [(cell[0] + 0.5 + side[0] / 2) * e, (cell[1] + 0.5 + side[1] / 2) * e];

export default {
  id: 'L4.engine.plume',
  level: 'L4',
  laws: ['the plume: behind a live engine a cone of half-angle engine.plumeHalfAngle carries thrust x engine.exhaustVelocity / 2 at P / (pi (d tan theta)^2); it burns the other ship\'s radiator panels, antennas and point defence inside it over edge^2 by matter.burnEnergyPerKg x their mass, never a hull cell (#297, #304, 13n.8)'],
  dependsOn: ['L4.helm.drift.v2'],
  setup: 'T1: createBattle, knowledge off; the leader R1d-A (heading 0) and the pursuer R1d-A (static, holding heading 0) behind it, both at throttle 1; (panels) 955 m behind, on the axis; (antenna) 942.5 m behind; (offset) 900 m behind and 535 m beside (its near hull side 520 m off the axis); 120 steps (13n.8 J3)',
  measure: 'the step each of the pursuer\'s fittings is ruined (fitting-ruined events); after the run each ruined panel\'s room count and sources, each ruined antenna\'s scan; every cell and plate event of both ships; the leader\'s ruined fittings',
  tolerance: 'steps exact, one-sided: ruined at n = ceil(q m / (I A dt)), the window [t, t + dt)',
  criterion: '(panels) the three bow panels ruined at step 21, the hand-worked literal; (antenna) the antenna at step 82, the literal; each other fitting of the pursuer inside the cone at its own formula step, none outside; (offset) no fitting ruined; in every case no hull cell or plate of either ship changes, the leader loses no fitting, a ruined panel leaves its room\'s count and the sources, a ruined antenna scans no more',
  tunable: ['engine.plumeHalfAngle', 'engine.thrust', 'engine.exhaustVelocity', 'matter.burnEnergyPerKg', 'radiator.mass', 'sensor.mass'],
  locked: null,
  cases() {
    return Object.keys(CASES).map((name) => ({ name }));
  },
  expected(ctx, c) {
    const p = ctx.params, e = 5, dt = ctx.dt, { D, L } = CASES[c.name];
    const theta = (p.engine.plumeHalfAngle.value * Math.PI) / 180, P = (p.engine.thrust.value * p.engine.exhaustVelocity.value) / 2, q = p.matter.burnEnergyPerKg.value;
    const mass = { radiator: p.radiator.mass.value, antenna: p.sensor.mass.value, pd: p.pd.mass.value, pdLaser: p.pdLaser.mass.value };
    const steps = {}, near = [];
    SHIP.fittings.forEach(([type, , cell, side], id) => {
      if (!BURNS.has(type)) return;
      const [x, y] = midpoint(cell, side, e), d = D - x, lat = Math.abs(L + y - 15), R = d * Math.tan(theta);
      if (!(d > 0) || lat > R) return;
      const n = (q * mass[type]) / ((P / (Math.PI * R * R)) * e * e * dt);
      if (Math.abs(n - Math.round(n)) < 1e-6) near.push(id);
      steps[id] = Math.ceil(n);
    });
    const literal = c.name === 'panels' ? { 14: 21, 15: 21, 16: 21 } : c.name === 'antenna' ? { 34: 82 } : {};
    return { steps, literal, near };
  },
  run(ctx, c) {
    const { D, L } = CASES[c.name], open = (w) => { for (const r of w.rooms) if (r.type === 'engine') r.engine.throttle = 1; };
    const b = createBattle({ params: ctx.params, tier: 'T1', attacker: SHIP, target: SHIP, bearing: [-D / Math.hypot(D, L), L / Math.hypot(D, L)], distance: Math.hypot(D, L), attackerHeading: 0, setup: { attacker: open, target: open } });
    while (b.step < 120 && !b.ended) tick(b);
    const A = b.attacker.world, T = b.target.world;
    const ruined = Object.fromEntries(A.log.events.filter((x) => x.type === 'fitting-ruined').map((x) => [x.fitting, Math.round(x.t / ctx.dt)]));
    const changed = (w) => w.log.events.filter((x) => /^(cell|plate)-/.test(x.type)).length;
    // After the run: the ruined fittings work no more (a panel: not counted, no source; an antenna: no scan; pd: not able).
    const sources = new Set(sourcesOf(A).map((x) => x.id));
    const after = A.fittings.filter((f) => f.ruined).map((f) => {
      const host = A.rooms.find((r) => r.id === f.room);
      if (f.type === 'radiator') return { id: f.id, ok: !sources.has(`panel:${f.id}`) && host.radiators === A.fittings.filter((g) => g.type === 'radiator' && g.room === f.room && !g.ruined).length };
      if (f.type === 'antenna') { setScan(A, A.fittings.filter((g) => g.type === 'antenna').indexOf(f), 0); return { id: f.id, ok: !sourcesOf(A).some((x) => x.id === `antenna:${f.id}`) }; }
      return { id: f.id, ok: !pdAble(A, f) };
    });
    return { ruined, cellEvents: { A: changed(A), T: changed(T) }, leaderRuined: T.log.events.filter((x) => x.type === 'fitting-ruined').length, after, heading: [b.attacker.world.ship.bodies[0].theta, T.ship.bodies[0].theta], steps: b.step };
  },
  compare(e, a) {
    const ids = (o) => Object.keys(o).sort((x, y) => x - y).join(',');
    const checks = {
      'the hand-worked literals (steps 21 / 82)': Object.entries(e.literal).every(([id, n]) => e.steps[id] === n && a.ruined[id] === n),
      'every fitting inside the cone at its formula step, none outside': ids(a.ruined) === ids(e.steps) && Object.entries(e.steps).every(([id, n]) => a.ruined[id] === n),
      'no formula step within 1e-6 of a whole step': e.near.length === 0,
      'no hull cell or plate of either ship changes': a.cellEvents.A === 0 && a.cellEvents.T === 0,
      'the leader loses no fitting': a.leaderRuined === 0,
      'a ruined fitting works no more': a.after.every((x) => x.ok),
      'both hold heading 0 within 1e-5 rad (the geometry holds to 1 cm at 955 m)': a.heading.every((x) => Math.abs(x) <= 1e-5) && a.steps === 120,
    };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected, list = (o) => Object.entries(o).map(([id, n]) => `#${id}@${n}`).join(' ') || 'none';
    return { expected: `literals ${list(e.literal)}; by the formula ${list(e.steps)}`, actual: `ruined ${list(a.ruined)}; cell or plate events A ${a.cellEvents.A}, T ${a.cellEvents.T}; leader ruined ${a.leaderRuined}; headings ${a.heading.join(', ')}` };
  },
};
