import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, enablePowerRouting, setDemand, setActive, step, readout, fixtureImpulse } from '../../../js/rooms.js';

// S17 of physics pass 2 (DESIGN.md 13k.4; scenario audit Q6-1): the control rules of 13f.1. R1 at T1 at rest, no
// power routing (every room powered): the turret firing freely (aimed +y), the shield generator taking a 5 MW beam
// at strength 1 (L1's incoming beam), the reactor at full demand, the beam bay firing. The bridge is switched off at
// 2 s and on again at 4 s; 70 s in all (the reactor restarts reactor.restartTime after control is back, S10).
// R1, the reference ship (13f.2): x forward, the T1 drydock grid; cells [x0, x1) x [y0, y1); the engine (2 x 3)
// rotated 90 degrees so it spans [0, 3) x [2, 4) with its exhaust at x = 0.
const R1_ROOMS = [
  { id: 'engine', type: 'engine', cell: [0, 2], rotation: 90 }, { id: 'reactor', type: 'reactor', cell: [3, 2] },
  { id: 'bridge', type: 'bridge', cell: [5, 2] }, { id: 'magazine', type: 'magazine', cell: [7, 2] },
  { id: 'beamBay', type: 'beamBay', cell: [9, 2] }, { id: 'heatSink', type: 'heatSink', cell: [3, 4] },
  { id: 'quarters', type: 'quarters', cell: [5, 4] }, { id: 'turret', type: 'turret', cell: [8, 4] },
  { id: 'shield', type: 'shieldGenerator', cell: [3, 0] }, { id: 'hold', type: 'hold', cell: [7, 0] },
];
// One fitting per open edge: 17 radiators, then 4 RCS (fitting ids 17-20).
const R1_FITTINGS = [
  ['radiator', 'engine', [1, 3], [0, 1]], ['radiator', 'engine', [2, 3], [0, 1]], ['radiator', 'engine', [1, 2], [0, -1]], ['radiator', 'engine', [2, 2], [0, -1]],
  ['radiator', 'heatSink', [3, 5], [0, 1]], ['radiator', 'heatSink', [4, 5], [0, 1]], ['radiator', 'heatSink', [3, 4], [-1, 0]], ['radiator', 'heatSink', [3, 5], [-1, 0]],
  ['radiator', 'shield', [3, 0], [0, -1]], ['radiator', 'shield', [4, 0], [0, -1]], ['radiator', 'shield', [3, 0], [-1, 0]], ['radiator', 'shield', [3, 1], [-1, 0]],
  ['radiator', 'shield', [4, 0], [1, 0]], ['radiator', 'shield', [4, 1], [1, 0]],
  ['radiator', 'beamBay', [10, 2], [1, 0]], ['radiator', 'beamBay', [10, 3], [1, 0]], ['radiator', 'beamBay', [9, 2], [0, -1]],
  ['rcs', 'engine', [0, 3], [0, 1]], ['rcs', 'engine', [0, 2], [0, -1]], ['rcs', 'beamBay', [10, 3], [0, 1]], ['rcs', 'beamBay', [10, 2], [0, -1]],
];
/** Build R1 in the kernel at `tier`: magazine full of HE, the turret's ready store full and holding fire; `setup(world, room)` before enableShip. */
function buildR1(ctx, { tier = 'T1', velocity = [0, 0], omega = 0, heading = 0, routing = null, setup = null } = {}) {
  const edge = ctx.tiers[tier].edge;
  const world = createWorld({ params: ctx.params, edge, dt: ctx.dt, grid: ctx.tiers[tier].grid });
  for (const r of R1_ROOMS) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0 });
  for (const [type, room, cell, side] of R1_FITTINGS) addFitting(world, type, room, cell, side);
  const room = (id) => world.rooms.find((r) => r.id === id);
  loadMagazine(world, room('magazine'), { heMass: ctx.scaled(ctx.params.magazine.capacity, edge) });
  loadTurret(room('turret'), ctx.params.turret.readyRounds.value);
  room('turret').turret.hold = true;
  if (routing) enablePowerRouting(world, routing);
  if (setup) setup(world, room);
  enableShip(world, { velocity, omega, heading });
  return { world, room };
}
const OFF = 2, ON = 4, END = 70; // s
const ROOMS_CHECKED = ['turret', 'shield', 'reactor', 'beamBay'];
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L3.control.rules',
  level: 'L3',
  laws: ['a room works only while live walls join it to a working bridge (13f.1, #12, #81)', 'control-lost and control-restored events (#156)', 'thrust pushes at the exhaust: off the centre of mass it turns the ship (#14)'],
  dependsOn: [],
  setup: 'R1 at T1 (13f.2) at rest, no routing: (timeline) the turret firing freely aimed +y, the shield on under a 5 MW incoming beam, the reactor at full demand, the beam bay firing; the bridge switched off at 2 s and on at 4 s; 70 s. (thrust) one step of the engine at full throttle; (fixture) the same impulse F dt applied at the centre of mass by the kernel\'s fixtureImpulse (13k.4 S17)',
  measure: 'per step and per room: controlled at the step\'s start and whether it worked (a shot, absorbed power, delivered power, beam power); the control-lost and control-restored events; (thrust, fixture) the change of R1\'s angular velocity and the exhaust\'s arm',
  tolerance: 'exact; the angular velocity 1e-9 relative (a closed form against the kernel\'s integration)',
  criterion: '(timeline) no room works in a step that starts without control; the shield absorbs and the beam bay beams in every step that starts with control; the turret fires before 2 s and again after 4 s; the reactor delivers before 2 s, not from the step after control is lost until it restarts at 4 + reactor.restartTime = 64 s (one-sided), and from then on; each of the four rooms raises control-lost once (after 2 s) and control-restored once (after 4 s), in that order. (thrust) re-statement: delta omega = (r x F) dt / I with r the exhaust\'s point (x = 0, y = 15 m) less the centre of mass, F = engine.thrust (15 MN, literal) along +x, 1e-9; (fixture) F dt at the centre of mass: delta omega = 0 exactly (#12, #14, #81, #82, #244)',
  tunable: ['engine.thrust', 'reactor.restartTime'],
  locked: { date: '2026-10-22', hash: 'e07f4002' },
  cases() {
    return [{ part: 'timeline' }, { part: 'thrust' }, { part: 'fixture' }];
  },
  expected(ctx, c) {
    if (c.part === 'timeline') return { restart: ON + ctx.params.reactor.restartTime.value, dt: ctx.dt };
    return { F: 1.5e7, dt: ctx.dt };
  },
  run(ctx, c) {
    const setup = (w, r) => {
      if (c.part !== 'timeline') return;
      setDemand(w, r('reactor'), 1);
      r('turret').turret.hold = false; r('turret').turret.aim = [0, 1];
      r('shield').shield.incoming = 5e6;
      r('beamBay').beamBay.firing = true;
    };
    const { world, room } = buildR1(ctx, { setup });
    const b = world.ship.bodies[0];
    if (c.part !== 'timeline') {
      const centre = readout(world).centre, F = ctx.scaled(ctx.params.engine.thrust, ctx.tiers.T1.edge), w0 = b.omega, I = b.I;
      if (c.part === 'thrust') { room('engine').engine.throttle = 1; step(world); }
      else fixtureImpulse(world, [F * ctx.dt, 0], centre);
      return { dOmega: b.omega - w0, arm: room('engine').exhaust[1] - centre[1], I, F };
    }
    const rows = [];
    while (world.t < END - 1e-9) {
      if (Math.abs(world.t - OFF) < 1e-9) setActive(world, room('bridge'), false);
      if (Math.abs(world.t - ON) < 1e-9) setActive(world, room('bridge'), true);
      const t0 = world.t, controlled = Object.fromEntries(ROOMS_CHECKED.map((id) => [id, room(id).controlled])), shots = room('turret').turret.shots;
      step(world);
      rows.push({ t0, controlled, worked: { turret: room('turret').turret.shots > shots, shield: room('shield').shield.absorbed > 0, reactor: room('reactor').reactor.delivered > 0, beamBay: room('beamBay').beamBay.beam > 0 } });
    }
    const ev = (type) => Object.fromEntries(ROOMS_CHECKED.map((id) => [id, world.log.events.filter((e) => e.type === type && e.room === id).map((e) => e.t)]));
    const restart = world.log.events.find((e) => e.type === 'reactor-restart');
    return {
      workedWithout: ROOMS_CHECKED.filter((id) => rows.some((r) => !r.controlled[id] && r.worked[id])),
      alwaysUnder: ['shield', 'beamBay'].filter((id) => rows.every((r) => !r.controlled[id] || r.worked[id])),
      turretBefore: rows.some((r) => r.t0 < OFF && r.worked.turret), turretAfter: rows.some((r) => r.t0 > ON && r.worked.turret),
      reactorBefore: rows.filter((r) => r.t0 < OFF).every((r) => r.worked.reactor),
      reactorGap: rows.filter((r) => r.t0 > OFF && r.t0 < (restart ? restart.t : END)).every((r) => !r.worked.reactor),
      reactorAfter: restart ? rows.filter((r) => r.t0 >= restart.t).every((r) => r.worked.reactor) : false,
      restart: restart ? restart.t : null, lost: ev('control-lost'), restored: ev('control-restored'),
    };
  },
  compare(e, a, c) {
    const checks = {};
    if (c.part === 'timeline') Object.assign(checks, {
      'no room works without control': a.workedWithout.length === 0,
      'shield and beam bay work whenever controlled': a.alwaysUnder.length === 2,
      'turret fires before 2 s and after 4 s': a.turretBefore && a.turretAfter,
      'reactor delivers before, not in the gap, again from its restart': a.reactorBefore && a.reactorGap && a.reactorAfter,
      'reactor restarts at 64 s, one-sided': a.restart !== null && a.restart >= e.restart - 1e-9 * e.restart && a.restart < e.restart + e.dt + 1e-9 * e.restart,
      'control-lost once after 2 s, control-restored once after 4 s, each room': ROOMS_CHECKED.every((id) => a.lost[id].length === 1 && a.lost[id][0] > OFF - 1e-9 && a.lost[id][0] < ON && a.restored[id].length === 1 && a.restored[id][0] > ON - 1e-9),
    });
    else if (c.part === 'thrust') Object.assign(checks, { 'thrust literal 15 MN': a.F === e.F, 'delta omega = (r x F) dt / I': Number.isFinite(a.dOmega) && Math.abs(a.dOmega - (-a.arm * a.F * e.dt) / a.I) <= 1e-9 * Math.abs(a.dOmega) && a.dOmega !== 0 });
    else Object.assign(checks, { 'no turn from an impulse at the centre of mass': a.dOmega === 0 });
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    if (r.case.part === 'timeline') return { expected: `no work without control; reactor restart at ${r.expected.restart} s`, actual: `worked without control: ${a.workedWithout.join(', ') || 'none'}; restart ${a.restart === null ? 'none' : a.restart.toFixed(4)} s; lost ${ROOMS_CHECKED.map((id) => a.lost[id].map((t) => t.toFixed(3)).join('/')).join(', ')}; restored ${ROOMS_CHECKED.map((id) => a.restored[id].map((t) => t.toFixed(3)).join('/')).join(', ')}` };
    return { expected: r.case.part === 'thrust' ? 'delta omega = -arm F dt / I' : 'delta omega = 0', actual: `delta omega ${a.dOmega.toExponential(9)} rad/s (arm ${a.arm.toFixed(6)} m, I ${a.I.toExponential(6)})` };
  },
};
