import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { shipDynamics } from '../../../js/pilot.js';
import { R2 } from '../../builds.js';

// K3 of §17 item 55 (DESIGN.md 13n.9, #335): the broadside mirror race. Each ship chased a point fixed to the other's
// current bow and, under a range order, points its bow along its thrust: from a broadside opening the mirrors raced
// side by side. Under #335's laws (the turn sense and the delivered thrust in the pilot, the position's lead only at
// range and its yield in the navigator) the helm behaviour suite's properties (1) and (2) hold on R2's mirror.
//
// Setup (T1), as tools/estimates/helm-suite.mjs's cells: R2 (mission0/builds.js, unchanged by #330) against R2, both
// the standard enemy (personality 0.5 each, its default orders), knowledge on, seed 1, at 600 / 900 / 1500 / 2500 m;
// bow: the attacker on the target's bearing +x, each bow-on to the other; broadside: on bearing +y with the attacker's
// heading 0 (both broadside to the line of sight); battle.cullDistance 5000 m at 2500 m (as #330 and the suite), else
// its value; each to its end or 600 s.
// (1) separation: the minimum distance between the main bodies' centres of mass over the steps at which both ships can
// manoeuvre, judged at each whole second (the pilot's report shows thrust and an RCS couple, the orders' throttle is
// above 0, and an engine asked to thrust is given at least a tenth of its draw), at least 150 m: J1's floor
// (L4.helm.separation: helm.rangeClose's lowest approved value / 2).
// (2) no race: each main body's speed at the end at most 2 x the braking curve's speed a (sqrt(2 D / a + t180^2) -
// t180) from D = max(the opening range, helm.rangeOpen) + helm.rangeBand (the fastest a range order can want), each
// ship's a = engine.thrust x footprint / M x its orders' throttle and t180 = 2 sqrt(pi / alpha) (alpha the smaller
// couple of its RCS fittings, rcs.force, over I) at the start, hand-worked from the ship (13n.9's suite; js/data.js).
// Before #335 the cells fail 6 of 8 (the race at broadside 600-2500 m, the separation at bow 1500 and 2500 m); the
// probe's P3 fails none.
const RANGES = [600, 900, 1500, 2500], OPENINGS = ['bow', 'broadside'];
const STD = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };
const LIMIT = 600;

export default {
  id: 'L4.helm.race',
  level: 'L4',
  laws: ['standing orders: movement: the mirrors do not race and keep apart (13n.9, #335: the turn sense, the delivered thrust, the position\'s lead only at range, the position yields)'],
  dependsOn: ['L4.helm.separation', 'L4.pilot.turn180', 'L4.pilot.thrust'],
  setup: 'T1: createBattle R2 against R2, both the standard enemy (personality 0.5 each), knowledge on, seed 1, at 600 / 900 / 1500 / 2500 m, bow (bearing +x) and broadside (bearing +y, attacker heading 0); battle.cullDistance 5000 m at 2500 m; to the end or 600 s (13n.9 K3, the helm suite\'s R2:R2 default cells)',
  measure: '(1) the minimum separation of the main bodies over the steps at which both ships can manoeuvre (judged each whole second); (2) each main body\'s speed at the end',
  tolerance: 'a floor on (1) and a ceiling on (2)',
  criterion: 'in all 8 cells (1) the minimum separation while both can manoeuvre is at least 150 m (helm.rangeClose\'s lowest approved value / 2) and (2) each ship\'s speed at the end is at most 2 x a (sqrt(2 D / a + t180^2) - t180), D = max(range, helm.rangeOpen) + helm.rangeBand, a and t180 hand-worked from the ship at the start; before #335 6 of 8 fail',
  tunable: ['helm.positionPatience', 'helm.positionReset', 'helm.positionLead', 'helm.rangeBand', 'helm.rangeOpen'],
  locked: null,
  cases() {
    const out = [];
    for (const range of RANGES) for (const opening of OPENINGS) out.push({ range, opening });
    return out;
  },
  expected(ctx, c) {
    const params = paramsOf(ctx, c), b = battleOf(params, c), e = b.edge, s = (x) => ctx.scaled(x, e);
    const D = Math.max(c.range, s(params.helm.rangeOpen)) + s(params.helm.rangeBand);
    const cap = [b.attacker, b.target].map((side) => {
      const B = mainBody(side), force = s(params.rcs.force);
      let thrust = 0, ccw = 0, cw = 0;
      for (const r of side.world.rooms) if (r.type === 'engine' && r.placed) thrust += s(params.engine.thrust) * r.footprintFactor;
      for (const f of side.world.fittings) {
        if (f.type !== 'rcs') continue;
        const tau = (f.p[0] - B.c[0]) * (-f.side[1] * force) - (f.p[1] - B.c[1]) * (-f.side[0] * force);
        if (tau > 0) ccw += tau; else cw -= tau;
      }
      const o = { ...side.helm.orders, ...(side.helm.override || {}) }, a = (thrust / B.M) * o.throttle, t180 = 2 * Math.sqrt(Math.PI / (Math.min(ccw, cw) / B.I));
      return 2 * a * (Math.sqrt((2 * D) / a + t180 * t180) - t180);
    });
    return { floor: ctx.params.helm.rangeClose.min / 2, cap };
  },
  run(ctx, c) {
    const b = battleOf(paramsOf(ctx, c), c), steps = Math.round(LIMIT / b.dt), perSecond = Math.round(1 / b.dt);
    let min = Infinity, at = null, both = true;
    while (!b.ended && b.step < steps) {
      tick(b);
      const A = mainBody(b.attacker), T = mainBody(b.target);
      if (!A || !T) continue;
      const r = Math.hypot(T.x[0] - A.x[0], T.x[1] - A.x[1]);
      if (b.step % perSecond === 0) both = able(b, b.attacker) && able(b, b.target);
      if (both && r < min) { min = r; at = b.t; }
    }
    const speed = [b.attacker, b.target].map((s) => { const B = mainBody(s); return B ? Math.hypot(B.v[0], B.v[1]) : 0; });
    return { min, at, speed, t: b.t, end: b.ended ? `${b.ended.kind} ${b.ended.side} at ${b.ended.t.toFixed(2)} s` : `none by ${LIMIT} s` };
  },
  compare(e, a) {
    const sep = a.min >= e.floor, race = a.speed.every((v, i) => v <= e.cap[i]), pass = sep && race;
    return { pass, note: pass ? '' : [!sep && `separation ${a.min.toFixed(1)} m`, !race && `race: speeds ${a.speed.map((v) => v.toFixed(1))} m/s`].filter(Boolean).join('; ') };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    return {
      expected: `separation >= ${e.floor} m; end speeds <= ${e.cap.map((v) => v.toFixed(1)).join(' / ')} m/s`,
      actual: `separation ${a.min.toFixed(1)} m at ${a.at === null ? '-' : a.at.toFixed(2)} s; end speeds ${a.speed.map((v) => v.toFixed(1)).join(' / ')} m/s; ${a.end}`,
    };
  },
};

/** The suite's test of a ship that can manoeuvre: the pilot's report shows thrust and a couple, the orders' throttle is above 0, and its engines asked to thrust are not all given under a tenth of their draw. */
function able(b, s) {
  if (!mainBody(s)) return false;
  const d = shipDynamics(b, s), o = { ...s.helm.orders, ...(s.helm.override || {}) };
  const engines = s.world.rooms.filter((r) => r.type === 'engine' && r.placed && r.engine.throttle > 0);
  const starved = !!s.world.power && engines.length > 0 && engines.every((r) => !(r.powerFraction >= 0.1));
  return d.a > 0 && d.t180 < Infinity && o.throttle > 0 && !starved;
}
function paramsOf(ctx, c) {
  const p = ctx.params;
  return c.range > 1500 ? { ...p, battle: { ...p.battle, cullDistance: { ...p.battle.cullDistance, value: 5000 } } } : p;
}
function battleOf(params, c) {
  const broadside = c.opening === 'broadside';
  return createBattle({ params, attacker: R2, target: R2, distance: c.range, seed: 1, knowledge: true, bearing: broadside ? '+y' : '+x', ...(broadside ? { attackerHeading: 0 } : {}), enemy: { A: STD, T: STD } });
}
