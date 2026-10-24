import { createBattle, tick } from '../../../js/battle.js';
import { pdAble } from '../../../js/rooms.js';
import { setScan, sourcesOf } from '../../../js/sensors.js';
import { SENSOR_SHIPS } from '../../targets.js';

// Successor of L4.engine.plume (J3 of L5e1, DESIGN.md 13n.8, 13n.1 (e) "The engine's plume", #297, #304, #316) under
// the lead designer's answer 3 on PR #101 (the fix round): a fitting reaches the plume only if the segment from the
// plume's apex to it crosses no standing cell of its own ship. J3's antenna (the hold's -y edge) and its third bow
// panel (the beam bay's -y edge) face away from a jet on the axis 5-15 m above them: the segment runs through their own
// cells, so they no longer burn and J3's literal 82 cannot hold. The plume itself is unchanged: behind each live engine
// at throttle a cone of half-angle engine.plumeHalfAngle (30 deg) carries P = thrust x engine.exhaustVelocity / 2 (75
// GW) at P / (pi (d tan theta)^2) at the distance d along its axis; a radiator panel, antenna or point-defence fitting of
// the other ship inside it and not shadowed takes that over edge^2 (25 m^2 at T1) and is ruined at
// matter.burnEnergyPerKg x its mass; never a hull cell (mechanism C).
//
// Setup (T1), as J3: createBattle, knowledge off; the leader R1d-A (T, heading 0, holding it on its RCS) and the
// pursuer R1d-A (A, static, holding heading 0) behind it, both at throttle 1 from undock, so both accelerate alike: the
// leader's apex is its grid's (0, 15) m, its jet along -x; in the pursuer's grid the apex sits at (D, 15 - L), D and L
// the pursuer's centre of mass behind and beside the leader's; a fitting at grid (x_f, y_f) lies d = D - x_f along the
// axis and |L + y_f - 15| across it. Cases: (panels) D = 955 m, L = 0: the bow panels (the beam bay's (10, 2) +x and
// (10, 3) +x, x_f = 55 m) 900 m behind the apex on the axis; (antenna) D = 942.5 m, L = 20 m: the axis 5 m below the
// hull's -y side (grid y = -5), so the hold's antenna (42.5, 0) -y, 900 m behind, faces it; its scan ordered at undock
// (zone 0); (offset) D = 900 m, L = 535 m, J3's: the near hull side 520 m off the axis, outside the cone (radius at
// most 519.6 m); (inside) D = 900 m, L = 495 m: the near hull side 480 m off the axis, inside the cone's lateral limit
// with a margin of metres (the review's finding 4: J3's offset clause alone passed on 0.4 m). 120 steps (2 s).
// Hand-worked (13n.8 (2), tools/estimates/l5e1.mjs): P = 1.5e7 x 1e4 / 2 = 7.5e10 W; the step a fitting of mass m at d
// is ruined: n = ceil(q m pi (d tan 30)^2 / (P edge^2 dt)) = ceil(20.3575 x (m / 250) x (d / 900)^2) (at 900 m: radius
// 519.615 m, 88 419.4 W/m^2, 2.21049e6 W on 25 m^2; a panel's 0.75 MJ in 0.33929 s = 20.36 steps). (panels) both bow
// panels at step 21; the third (9, 2) -y and every fitting on the -x, +y or -y sides shadowed by the hull: nothing else.
// (antenna) the antenna at 900 m: 81.43 steps, step 82. (inside) the shield generator's (4, 0) -y panel at d = 877.5 m:
// 20.3575 x 0.950625 = 19.35, step 20; the antenna at d = 857.5 m: 20.3575 x 4 x 0.907785 = 73.92, step 74. Offset:
// nothing. Every other fitting inside a cone and not shadowed is ruined at its own step by the same formula (a
// re-statement); the shadowing is computed here by separating axes on the drydock's cells (the kernel clips the segment
// instead), and each answer is checked not to change when the apex moves 1 cm across the axis (both ships turn alike by
// at most 1e-5 rad, under 1 cm at 955 m). A shadowed fitting inside the cone takes no energy at all. A ruined panel
// radiates nothing (its room's count drops, it is no source), a ruined antenna does not scan: in (antenna) it is a
// source while it scans before its ruin and none from its ruin on, its scan ordered again in the step of the ruin
// (which clears it) and held to the end (the mutation l5e1.plume.antennaWorks survived J3, whose scan was ordered only
// after the run, with no step after it). No hull cell or plate of either ship
// changes; the leader's fittings never burn.
const SHIP = SENSOR_SHIPS['R1d-A'];
const CASES = { panels: { D: 955, L: 0 }, antenna: { D: 942.5, L: 20, scan: true }, offset: { D: 900, L: 535 }, inside: { D: 900, L: 495 } };
const LITERALS = { panels: { 14: 21, 15: 21 }, antenna: { 34: 82 }, offset: {}, inside: { 9: 20, 34: 74 } };
const BURNS = new Set(['radiator', 'antenna', 'pd', 'pdLaser']);
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const midpoint = (cell, side, e) => [(cell[0] + 0.5 + side[0] / 2) * e, (cell[1] + 0.5 + side[1] / 2) * e];
/** Separating axes: the closed segment a-b meets the open square [x0, x0 + e] x [y0, y0 + e] (touching is not meeting). */
function meets(a, b, x0, y0, e) {
  if (Math.max(a[0], b[0]) <= x0 || Math.min(a[0], b[0]) >= x0 + e || Math.max(a[1], b[1]) <= y0 || Math.min(a[1], b[1]) >= y0 + e) return false;
  const n = [a[1] - b[1], b[0] - a[0]], s = n[0] * a[0] + n[1] * a[1];
  const corners = [[x0, y0], [x0 + e, y0], [x0, y0 + e], [x0 + e, y0 + e]].map((c) => n[0] * c[0] + n[1] * c[1]);
  return Math.min(...corners) < s && s < Math.max(...corners);
}
const shadowedBy = (cells, apex, p, e) => cells.some(([x, y]) => meets(apex, p, x * e, y * e, e));

export default {
  id: 'L4.engine.plume.v2',
  level: 'L4',
  laws: ['the plume: behind a live engine a cone of half-angle engine.plumeHalfAngle carries thrust x engine.exhaustVelocity / 2 at P / (pi (d tan theta)^2); it burns the other ship\'s radiator panels, antennas and point defence inside it over edge^2 by matter.burnEnergyPerKg x their mass, never a hull cell (#297, #304, 13n.8)', 'occlusion: a fitting reaches the plume only if the segment from the apex to it crosses no standing cell of its own ship (the lead designer\'s answer 3 on PR #101)'],
  dependsOn: ['L4.helm.drift.v2'],
  setup: 'T1: createBattle, knowledge off; the leader R1d-A (heading 0) and the pursuer R1d-A (static, holding heading 0) behind it, both at throttle 1; (panels) 955 m behind on the axis; (antenna) 942.5 m behind, 20 m beside (the axis 5 m below its hull), its antenna scanning zone 0 from undock and ordered again after its ruin; (offset) 900 m behind, 535 m beside (near hull side 520 m off the axis); (inside) 900 m behind, 495 m beside (480 m); 120 steps (successor of 13n.8 J3)',
  measure: 'the step each of the pursuer\'s fittings is ruined (fitting-ruined events) and the energy each took; the pursuer\'s antenna among its sources at each step (antenna); after the run each ruined panel\'s room count and sources, each ruined point defence; every cell and plate event of both ships; the leader\'s ruined fittings; the drydock cells (the build\'s data)',
  tolerance: 'steps exact, one-sided: ruined at n = ceil(q m / (I A dt)), the window [t, t + dt); a shadowed fitting takes 0 J',
  criterion: 'the hand-worked literals: (panels) the two bow panels at step 21, (antenna) the antenna at step 82, (inside) the (4, 0) -y panel at step 20 and the antenna at step 74; each other fitting of the pursuer inside the cone and not shadowed at its own formula step, none other ruined, every shadowed or outside one at 0 J; (offset) no fitting takes any energy; no shadowing answer changes for the apex moved 1 cm across the axis; (antenna) the antenna a source at the step before its ruin and none at every step from its ruin to the end, its scan ordered again in the step of the ruin and still ordered at the end; no hull cell or plate of either ship changes, the leader loses no fitting, a ruined panel leaves its room\'s count and the sources, a ruined point defence is not able; both hold heading 0 within 1e-5 rad',
  tunable: ['engine.plumeHalfAngle', 'engine.thrust', 'engine.exhaustVelocity', 'matter.burnEnergyPerKg', 'radiator.mass', 'sensor.mass'],
  locked: null,
  cases() {
    return Object.keys(CASES).map((name) => ({ name }));
  },
  expected(ctx, c) {
    const p = ctx.params, e = 5, dt = ctx.dt, { D, L } = CASES[c.name];
    const theta = (p.engine.plumeHalfAngle.value * Math.PI) / 180, P = (p.engine.thrust.value * p.engine.exhaustVelocity.value) / 2, q = p.matter.burnEnergyPerKg.value;
    const mass = { radiator: p.radiator.mass.value, antenna: p.sensor.mass.value, pd: p.pd.mass.value, pdLaser: p.pdLaser.mass.value };
    const cone = {}, near = [];
    SHIP.fittings.forEach(([type, , cell, side], id) => {
      if (!BURNS.has(type)) return;
      const [x, y] = midpoint(cell, side, e), d = D - x, lat = Math.abs(L + y - 15), R = d * Math.tan(theta);
      if (!(d > 0) || lat > R) return;
      const n = (q * mass[type]) / ((P / (Math.PI * R * R)) * e * e * dt);
      if (Math.abs(n - Math.round(n)) < 1e-6) near.push(id);
      cone[id] = { step: Math.ceil(n), p: [x, y] };
    });
    return { cone, apex: [D, 15 - L], literal: LITERALS[c.name], near, edge: e };
  },
  run(ctx, c) {
    const { D, L, scan } = CASES[c.name], open = (w) => { for (const r of w.rooms) if (r.type === 'engine') r.engine.throttle = 1; };
    const b = createBattle({ params: ctx.params, tier: 'T1', attacker: SHIP, target: SHIP, bearing: [-D / Math.hypot(D, L), L / Math.hypot(D, L)], distance: Math.hypot(D, L), attackerHeading: 0, setup: { attacker: open, target: open } });
    const A = b.attacker.world, T = b.target.world, antenna = A.fittings.find((f) => f.type === 'antenna');
    if (scan) setScan(A, antenna, 0);
    const source = [];
    let reordered = null;
    while (b.step < 120 && !b.ended) {
      tick(b);
      if (!scan) continue;
      source.push(sourcesOf(A).some((x) => x.id === `antenna:${antenna.id}`));
      if (antenna.ruined && reordered === null) { setScan(A, antenna, 0); reordered = b.step; } // the ruin cleared its scan: ordered again
    }
    const ruined = Object.fromEntries(A.log.events.filter((x) => x.type === 'fitting-ruined').map((x) => [x.fitting, Math.round(x.t / ctx.dt)]));
    const burned = Object.fromEntries(A.fittings.filter((f) => BURNS.has(f.type)).map((f) => [f.id, f.burned || 0]));
    const changed = (w) => w.log.events.filter((x) => /^(cell|plate)-/.test(x.type)).length;
    const sources = new Set(sourcesOf(A).map((x) => x.id));
    const after = A.fittings.filter((f) => f.ruined && f.type !== 'antenna').map((f) => {
      const host = A.rooms.find((r) => r.id === f.room);
      if (f.type === 'radiator') return { id: f.id, ok: !sources.has(`panel:${f.id}`) && host.radiators === A.fittings.filter((g) => g.type === 'radiator' && g.room === f.room && !g.ruined).length };
      return { id: f.id, ok: !pdAble(A, f) };
    });
    const cells = [...A.layout.rooms.values()].flatMap((r) => r.cells.map((x) => [...x]));
    return { ruined, burned, source, reordered, scanOrdered: scan ? !!antenna.scan : null, cells, cellEvents: { A: changed(A), T: changed(T) }, leaderRuined: T.log.events.filter((x) => x.type === 'fitting-ruined').length, after, heading: [A.ship.bodies[0].theta, T.ship.bodies[0].theta], steps: b.step };
  },
  compare(e, a, c) {
    const ids = (o) => Object.keys(o).sort((x, y) => x - y).join(',');
    // The shadowing, from the drydock's cells (separating axes), and its stability for the apex 1 cm either side.
    const steps = {}, late = [], unstable = [];
    for (const [id, f] of Object.entries(e.cone)) {
      const s = [0, 0.01, -0.01].map((dy) => shadowedBy(a.cells, [e.apex[0], e.apex[1] + dy], f.p, e.edge));
      if (s.some((x) => x !== s[0])) unstable.push(id);
      if (!s[0] && f.step <= 120) steps[id] = f.step;
      else if (!s[0]) late.push(id); // reached but not ruined within the run: it takes energy, not yet enough
    }
    const checks = {
      'the hand-worked literals': Object.entries(e.literal).every(([id, n]) => steps[id] === n && a.ruined[id] === n),
      'every fitting inside the cone and not shadowed at its formula step, none other': ids(a.ruined) === ids(steps) && Object.entries(steps).every(([id, n]) => a.ruined[id] === n),
      'every shadowed or outside fitting takes 0 J (one reached but not ruined in the run takes some)': Object.entries(a.burned).every(([id, J]) => id in steps || (late.includes(id) ? J > 0 : J === 0)),
      'no formula step within 1e-6 of a whole step': e.near.length === 0,
      'no shadowing answer changes for the apex moved 1 cm': unstable.length === 0,
      'no hull cell or plate of either ship changes': a.cellEvents.A === 0 && a.cellEvents.T === 0,
      'the leader loses no fitting': a.leaderRuined === 0,
      'a ruined panel or point defence works no more': a.after.every((x) => x.ok),
      'both hold heading 0 within 1e-5 rad': a.heading.every((x) => Math.abs(x) <= 1e-5) && a.steps === 120,
    };
    if (c.name === 'antenna') {
      const n = a.ruined[34];
      checks['the antenna a source before its ruin, none from it on, its scan ordered again after the ruin'] = n > 1 && a.source[n - 2] === true && a.source.slice(n - 1).every((x) => x === false) && a.reordered === n && a.scanOrdered === true;
    }
    if (c.name === 'offset') checks['offset: no fitting takes any energy'] = Object.values(a.burned).every((J) => J === 0);
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual, e = r.expected, list = (o) => Object.entries(o).map(([id, n]) => `#${id}@${n}`).join(' ') || 'none';
    return { expected: `literals ${list(e.literal)}; in the cone ${list(Object.fromEntries(Object.entries(e.cone).map(([id, f]) => [id, f.step])))} before the shadowing`, actual: `ruined ${list(a.ruined)}; burnt but not ruined ${Object.entries(a.burned).filter(([id, J]) => J > 0 && !(id in a.ruined)).map(([id]) => `#${id}`).join(' ') || 'none'}; cell or plate events A ${a.cellEvents.A}, T ${a.cellEvents.T}; leader ruined ${a.leaderRuined}; headings ${a.heading.join(', ')}` };
  },
};
