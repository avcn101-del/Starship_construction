import { createWorld, addRoom, setDemand, enablePowerRouting, loadTurret, damageCell, step, runUntil } from '../../../js/rooms.js';

// S18 of physics pass 2 (DESIGN.md 13k.4; scenario audit Q6-2): a consumer supplied a fraction of its draw works at
// that fraction (13d.1). In a cluster at T1: an M reactor at (0, 0) and one consumer beside it at (2, 0), power
// routed; the reactor's demand is set so that it can produce exactly half the consumer's draw (fraction 0.5) or
// nothing (demand 0, fraction 0). Consumers: an M turret (firing freely, 40 rounds in its store), an M shield
// generator under a 10 MW incoming beam (above its budget), M crew quarters starting at 300 K with an M hold at
// (5, 0) whose cell 0 is damaged by 1/3.
const T_FIRE = 20.25; // s of free fire (off the shot grid)
const close = (e, a, tol) => Number.isFinite(a) && Math.abs(a - e) <= tol * Math.max(Math.abs(e), Math.abs(a));
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
const DRAW = { turret: 'turret.powerDraw', shieldGenerator: 'shield.powerDraw', quarters: 'quarters.powerDraw' };

export default {
  id: 'L2.power.fraction',
  level: 'L2',
  laws: ['a consumer supplied a fraction f of its draw works at f: every rate-like output and its heat x f (#193, 13d.1)', 'life support runs while the room is joined to a reactor able to produce (#207)'],
  dependsOn: [],
  setup: 'in a cluster at T1 an M reactor (0, 0) and beside it (2, 0) an M turret (firing freely), an M shield generator (10 MW incoming) or M crew quarters (300 K, a damaged hold cell at (5, 0)), power routed, the reactor able to produce half the consumer\'s draw (fraction 0.5) or nothing (demand 0) (13k.4 S18)',
  measure: 'the consumer\'s power fraction and powered flag in the first step; its energy drawn per step; (turret) shots by 20.25 s; (shield) the absorbed power; (quarters) its repair budget (kg/s) and whether its life support runs',
  tolerance: '1e-9 relative (a closed form against the kernel\'s routing); counts exact',
  criterion: 'fraction 0.5: powered, fraction = 0.5 (1e-9); energy drawn per step = 0.5 x draw x dt; (turret) rate = 0.5 x turret.fireRate: shots by 20.25 s = 1 + floor(0.25 x 20.25) = 6 (full rate would give 11); (shield) absorbed = 0.5 x shield.budget = 5 MW (the 10 MW beam is above the halved budget); (quarters) repair budget = 0.5 x repair.massRate = 100 kg/s, and its life support runs (#207: joined to a reactor able to produce, whatever the fraction). Fraction 0: powered false, nothing drawn, no shot, nothing absorbed, no repair budget; life support does not run (the reactor at demand 0 is not able to produce, #207) (#193, #207, #244)',
  tunable: ['turret.powerDraw', 'turret.fireRate', 'shield.powerDraw', 'shield.budget', 'quarters.powerDraw', 'repair.massRate', 'reactor.power'],
  locked: null,
  cases() {
    const out = [];
    for (const consumer of ['turret', 'shieldGenerator', 'quarters']) for (const fraction of [0.5, 0]) out.push({ consumer, fraction });
    return out;
  },
  expected(ctx, c) {
    const p = ctx.params, [g, n] = DRAW[c.consumer].split('.'), draw = p[g][n].value, f = c.fraction;
    const e = { fraction: f, powered: f > 0, drawn: f * draw * ctx.dt };
    if (c.consumer === 'turret') e.shots = f > 0 ? 6 : 0;
    if (c.consumer === 'shieldGenerator') e.absorbed = f * p.shield.budget.value;
    if (c.consumer === 'quarters') Object.assign(e, { budget: f * p.repair.massRate.value, lifeSupport: f > 0 });
    return e;
  },
  run(ctx, c) {
    const p = ctx.params, world = createWorld({ params: p, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const reactor = addRoom(world, 'reactor', { id: 'reactor', cell: [0, 0] });
    const room = addRoom(world, c.consumer, { id: 'consumer', cell: [2, 0], ...(c.consumer === 'quarters' ? { temperature: 300 } : {}) });
    let hold = null;
    if (c.consumer === 'quarters') { hold = addRoom(world, 'hold', { id: 'hold', cell: [5, 0] }); damageCell(world, hold, 0, 1 / 3, 'hit-1', 'kinetic'); }
    if (c.consumer === 'turret') loadTurret(room, 40);
    if (c.consumer === 'shieldGenerator') room.shield.incoming = 1e7;
    enablePowerRouting(world, ['consumer']);
    const [g, n] = DRAW[c.consumer].split('.');
    setDemand(world, reactor, (c.fraction * p[g][n].value) / p.reactor.power.value);
    const drawn0 = () => (c.consumer === 'turret' ? room.turret.energyDrawn : c.consumer === 'shieldGenerator' ? room.shield.energyDrawn : room.quarters.energyDrawn);
    const before = drawn0();
    step(world);
    const out = { fraction: room.powerFraction, powered: room.powered, drawn: drawn0() - before };
    if (c.consumer === 'shieldGenerator') out.absorbed = room.shield.absorbed;
    if (c.consumer === 'quarters') Object.assign(out, { budget: room.quarters.budget, lifeSupport: room.lifeSupportOn });
    if (c.consumer === 'turret') { runUntil(world, T_FIRE); out.shots = room.turret.shots; }
    return out;
  },
  compare(e, a) {
    const eq = (x, y) => (x === 0 ? y === 0 : close(x, y, 1e-9));
    const checks = { fraction: eq(e.fraction, a.fraction), powered: a.powered === e.powered, 'energy drawn per step': eq(e.drawn, a.drawn) };
    if ('shots' in e) checks.shots = a.shots === e.shots;
    if ('absorbed' in e) checks.absorbed = eq(e.absorbed, a.absorbed);
    if ('budget' in e) Object.assign(checks, { 'repair budget': eq(e.budget, a.budget), 'life support': a.lifeSupport === e.lifeSupport });
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const f = (x) => Object.entries(x).map(([k, v]) => `${k} ${typeof v === 'number' ? (Number.isInteger(v) ? v : v.toPrecision(10)) : v}`).join(', ');
    return { expected: f(r.expected), actual: f(r.actual) };
  },
};
