import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { shipDynamics } from '../../../js/pilot.js';
import { setDemand, survivingFraction } from '../../../js/rooms.js';
import { R2 } from '../../builds.js';

// K7 of §17 item 58 (DESIGN.md 13n.10, #340): the delivered thrust's report expires. Under #335 a starved engine
// reported 0 until it was next asked to thrust, and a navigator that reads 0 never asks: the report latched. Now each
// live engine counts at the power fraction it was given at the last step it was asked to thrust; once it has not been
// asked for helm.thrustRetry the report expires and it counts at 1, so a starved engine is asked once per retry (no
// latch) and not more often (no chatter), and returning power is read afresh.
//
// Setup (T1), as tools/estimates/item58-k7.mjs: R2 (mission0/builds.js) against R2, both the standard enemy
// (personality 0.5 each, its default orders), knowledge on, seed 1, at 2500 m with the attacker on the target's
// bearing +x; battle.cullDistance 5000 m at 2500 m (as K3 and the helm suite). Test inputs: the target's reactor
// demand (L1's setDemand, before each step) 0.1 for steps 0-599 (2 MW: the fire preset's shield takes it all, the
// engine gets 0), then 1. The engine is asked at a step when its throttle after the step is above 0 (the pilot opened
// it in the step).
// Hand-worked: N = ceil(helm.thrustRetry / dt) = 60 at dt 1/60 s. An ask at step k is read by the pilot's report at
// step k + 1 (the router gave 0: the report is 0, asked at t(k + 1)); it expires at the first step whose t is
// helm.thrustRetry later, k + 1 + N, when the report counts at 1 and the navigator may ask again: asks N + 1 apart.
// (i) between two asks while starved at least N - 1 steps not asked, and an ask in each N + 1 steps after the first;
// (ii) after the demand returns at step 600 the engine is asked by step 600 + N; (iii) at the end of that step the
// pilot's acceleration = engine.thrust x footprint x surviving x f / M (one engine), f the fraction the router gave
// the engine in that step, the footprint, the surviving fraction and M (the main body's mass) read off the ship.
const STARVED = 600, STD = { aggression: 0.5, patience: 0.5, caution: 0.5, resolve: 0.5 };

export default {
  id: 'L4.pilot.retry',
  level: 'L4',
  laws: ['the delivered thrust\'s report expires: an engine not asked to thrust for helm.thrustRetry counts at 1 again, so a starved engine is asked once per retry and returning power is read afresh (13n.10, #340)'],
  dependsOn: ['L4.pilot.thrust', 'L2.power.fraction'],
  setup: 'T1 (13n.10 K7, tools/estimates/item58-k7.mjs): createBattle R2 against R2, both the standard enemy (personality 0.5 each), knowledge on, seed 1, 2500 m, the attacker on the target\'s bearing +x, battle.cullDistance 5000 m; the target\'s reactor demand 0.1 for steps 0-599 (its engine starved under the fire preset), then 1 (test inputs, before each step); to step 600 + ceil(helm.thrustRetry / dt)',
  measure: 'the steps at which the target\'s engine is asked to thrust (its throttle above 0 after the step); the first ask at or after step 600; at the end of that step the pilot\'s acceleration (shipDynamics(battle, side).a), the engine\'s power fraction, footprint and surviving fraction, the main body\'s mass; the fraction the router gave at each starved ask (information)',
  tolerance: 'integer step counts; (iii) 1e-12 relative (one product)',
  criterion: '(i) between two asks in steps 0-599 at least ceil(helm.thrustRetry / dt) - 1 = 59 steps not asked (no chatter), and from the first ask an ask in each ceil(helm.thrustRetry / dt) + 1 = 61 consecutive steps within 0-599 (no latch); (ii) an ask at or after step 600 by step 600 + ceil(helm.thrustRetry / dt) = 660; (iii) at the end of that step a = engine.thrust x footprint x surviving x f / M, f the fraction the router gave, at 1e-12 relative; before #340 (i) and (ii) fail (asked once, never again), item58-b.diff fails (i)',
  tunable: ['helm.thrustRetry'],
  locked: null,
  cases() {
    return [{ name: 'starved, then fed' }];
  },
  expected(ctx) {
    const N = Math.ceil(ctx.scaled(ctx.params.helm.thrustRetry, ctx.tiers.T1.edge) / ctx.dt - 1e-9); // ceil with float resolution (#308 (2))
    return { N, minGap: N - 1, window: N + 1, by: STARVED + N };
  },
  run(ctx) {
    const p = ctx.params, b = battleOf(ctx), s = b.target, w = s.world;
    const reactor = w.rooms.find((r) => r.type === 'reactor'), engine = w.rooms.find((r) => r.type === 'engine');
    const N = Math.ceil(ctx.scaled(p.helm.thrustRetry, b.edge) / b.dt - 1e-9), asks = [], starvedFractions = new Set();
    let after = null;
    for (let n = 0; n <= STARVED + N && !b.ended; n++) {
      setDemand(w, reactor, n < STARVED ? 0.1 : 1);
      tick(b);
      if (!(engine.engine.throttle > 0)) continue;
      if (n < STARVED) { asks.push(n); starvedFractions.add(engine.powerFraction); continue; }
      const M = mainBody(s).M, f = engine.powerFraction, a = shipDynamics(b, s).a;
      after = { n, a, f, M, footprint: engine.footprintFactor, surviving: survivingFraction(engine), hand: (ctx.scaled(p.engine.thrust, b.edge) * engine.footprintFactor * survivingFraction(engine) * f) / M };
      break;
    }
    const gaps = asks.slice(1).map((x, i) => x - asks[i] - 1);
    // The last window: from the last starved ask, N + 1 steps that end within 0-599 must hold another ask.
    const tail = asks.length ? STARVED - 1 - asks[asks.length - 1] : null;
    return { asks, gaps, tail, starvedFractions: [...starvedFractions], after, ended: b.ended ? b.ended.kind : null };
  },
  compare(e, a) {
    const rel = (x, y) => Math.abs(x - y) <= 1e-12 * Math.max(Math.abs(x), Math.abs(y));
    const ok = {
      '(i) asked while starved': a.asks.length > 0,
      '(i) no chatter': a.gaps.every((g) => g >= e.minGap),
      '(i) no latch': a.gaps.every((g) => g <= e.window - 1) && a.tail !== null && a.tail <= e.window - 1,
      '(ii) asked by 600 + N': a.after !== null && a.after.n <= e.by,
      '(iii) a = thrust x footprint x surviving x f / M': a.after !== null && rel(a.after.hand, a.after.a),
    };
    const pass = Object.values(ok).every(Boolean);
    return { pass, note: pass ? '' : Object.entries(ok).filter(([, v]) => !v).map(([k]) => k).join(', ') };
  },
  display(r) {
    const a = r.actual, e = r.expected, x = a.after;
    return {
      expected: `asks while starved at least ${e.minGap} steps apart (not asked between) and at most ${e.window - 1}; the first ask from step ${STARVED} by step ${e.by}; there a = engine.thrust x footprint x surviving x f / M`,
      actual: `${a.asks.length} asks in steps 0-${STARVED - 1} (${a.asks.join(', ')}); not asked between: ${[...new Set(a.gaps)].join(', ') || '-'}; after the last ${a.tail ?? '-'}; the router's fractions at those asks ${a.starvedFractions.join(', ') || '-'} (information); ${x ? `first ask from step ${STARVED} at step ${x.n}: a ${x.a.toPrecision(13)} m/s^2 against ${x.hand.toPrecision(13)} (f ${x.f}, footprint ${x.footprint}, surviving ${x.surviving}, M ${x.M.toFixed(1)} kg)` : `no ask by step ${e.by}`}${a.ended ? `; ended ${a.ended}` : ''}`,
    };
  },
};

function battleOf(ctx) {
  const p = ctx.params, params = { ...p, battle: { ...p.battle, cullDistance: { ...p.battle.cullDistance, value: 5000 } } };
  return createBattle({ params, attacker: R2, target: R2, distance: 2500, seed: 1, knowledge: true, bearing: '+x', enemy: { A: STD, T: STD } });
}
