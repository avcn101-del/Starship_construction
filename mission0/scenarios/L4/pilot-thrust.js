import { createBattle, tick, mainBody } from '../../../js/battle.js';
import { pilotStep, shipDynamics } from '../../../js/pilot.js';
import { setDemand } from '../../../js/rooms.js';
import { R2 } from '../../builds.js';

// K2 of §17 item 55 (DESIGN.md 13n.9, #335): the delivered thrust. The pilot's acceleration counts each live engine's
// thrust x its footprint x its surviving fraction x the power fraction it was given at the last step it was asked to
// thrust (1 until then): a starved engine (the fire preset routes power to engines last) reports none, so the braking
// curve and the range order's engagement use the thrust the ship has.
//
// Setup (T1): R2 (mission0/builds.js) as the battle's target side, at rest at heading 0, no helm, knowledge off, its
// shield on (createBattle's shield setting); the attacker R2 2500 m off on its -y bearing, static. Its power priority
// (a test input) puts the engine last: shield, turret, quarters, beam bay, hold, engine. Its reactor's demand d (a
// test input, L1's setDemand) sets the supply: d = 1 (the engine full), 0.4 (a fraction), 0.1 (starved). Each step the
// pilot is given heading 0 (the heading it has, at rest: no RCS fires in the step) and throttle 1; one step (from the
// second on the engine's thrust off the centre of mass turns the ship and the RCS fittings in the engine room and the
// beam bay draw too); the pilot's report (shipDynamics) before the step and after it.
// Hand-worked (routePower, L2): the reactor delivers d x reactor.power (20 MW); the consumers ahead of the engine draw
// shield.powerDraw (2 MW, on) + turret.powerDraw (0.2 MW, rounds in its store) + quarters.powerDraw (0.05 MW) = 2.25 MW
// (the beam bay and the hold's antenna draw nothing idle; every shared wall carries power.wallCapacity x 10 m = 20 MW,
// more than any draw, so no wall binds); the engine asks engine.powerDraw x throttle 1 = 10 MW and gets the rest:
// f = clamp((d x 20 - 2.25) / 10, 0, 1) = 1, 0.575, 0. The report: a = engine.thrust (15 MN) x footprint 1 x surviving
// 1 x f / M, M the flown body's mass; before any step it was asked to thrust, f = 1.
const CASES = [{ demand: 1 }, { demand: 0.4 }, { demand: 0.1 }];
const PRIORITY = ['shield', 'turret', 'quarters', 'beamBay', 'hold', 'engine'];

export default {
  id: 'L4.pilot.thrust',
  level: 'L4',
  laws: ['the delivered thrust: the pilot\'s acceleration counts each live engine at the power fraction it was given at the last step it was asked to thrust, 1 until then (13n.9, #335)'],
  dependsOn: ['L2.power.flow', 'L2.power.fraction'],
  setup: 'T1: createBattle, target R2 at rest at heading 0 (no helm, knowledge off, shield on), attacker R2 2500 m off on bearing -y (static); the target\'s power priority shield, turret, quarters, beam bay, hold, engine; its reactor demand 1, 0.4 or 0.1; each step its pilot given heading 0 and throttle 1; one step (13n.9 K2)',
  measure: 'the pilot\'s acceleration (shipDynamics(battle, side).a) before the step and after it; the engine\'s power fraction after it (information)',
  tolerance: '1e-12 relative (one product); 0 exactly for the starved case',
  criterion: 'after the step a = engine.thrust x 1 x 1 x f / M with f = clamp((d x reactor.power - shield.powerDraw - turret.powerDraw - quarters.powerDraw) / engine.powerDraw, 0, 1) worked by hand (1, 0.575, 0), at 1e-12 relative, and exactly 0 when f = 0; before the step a = engine.thrust / M (f = 1 until the engine is asked to thrust)',
  tunable: ['engine.thrust', 'engine.powerDraw', 'reactor.power', 'shield.powerDraw', 'turret.powerDraw', 'quarters.powerDraw'],
  locked: null,
  cases() {
    return CASES.map((c) => ({ ...c }));
  },
  expected(ctx, c) {
    const p = ctx.params, e = ctx.tiers.T1.edge, s = (x) => ctx.scaled(x, e);
    const supply = c.demand * s(p.reactor.power), ahead = s(p.shield.powerDraw) + s(p.turret.powerDraw) + s(p.quarters.powerDraw);
    const f = Math.min(1, Math.max(0, (supply - ahead) / s(p.engine.powerDraw)));
    const M = mainBody(battleOf(ctx).target).M;
    return { f, M, before: s(p.engine.thrust) / M, a: (s(p.engine.thrust) * 1 * 1 * f) / M };
  },
  run(ctx, c) {
    const b = battleOf(ctx), side = b.target, w = side.world;
    setDemand(w, w.rooms.find((r) => r.type === 'reactor'), c.demand);
    const before = shipDynamics(b, side).a;
    w.power.priority = [...PRIORITY];
    pilotStep(side, { heading: 0, throttle: 1 });
    tick(b);
    const engine = w.rooms.find((r) => r.type === 'engine');
    return { before, a: shipDynamics(b, side).a, fraction: engine.powerFraction, steps: b.step };
  },
  compare(e, a) {
    const rel = (x, y) => Math.abs(x - y) <= 1e-12 * Math.max(Math.abs(x), Math.abs(y));
    const okA = e.f === 0 ? a.a === 0 : rel(e.a, a.a), okB = rel(e.before, a.before), pass = okA && okB;
    return { pass, note: pass ? '' : [!okA && `a ${a.a} against ${e.a}`, !okB && `before ${a.before} against ${e.before}`].filter(Boolean).join('; ') };
  },
  display(r) {
    const a = r.actual, e = r.expected;
    return {
      expected: `a = engine.thrust x ${e.f} / ${e.M.toFixed(1)} kg = ${e.a.toPrecision(13)} m/s^2; before ${e.before.toPrecision(13)}`,
      actual: `a ${a.a.toPrecision(13)} m/s^2; before ${a.before.toPrecision(13)}; the engine's power fraction ${a.fraction}`,
    };
  },
};

function battleOf(ctx) {
  return createBattle({ params: ctx.params, attacker: R2, target: R2, distance: 2500, targetHeading: 0, shield: { target: true } });
}
