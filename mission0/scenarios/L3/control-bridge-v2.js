import { createWorld, addRoom, addFitting, enableShip, loadMagazine, loadTurret, step, setActive } from '../../../js/rooms.js';
import { buildShip } from '../../../js/battle.js';

// Successor of L3.control.bridge (DESIGN.md 13l.7, #271: the survivor f1.ctl.bridgeBackup, read in the hygiene round):
// a third case, R1 as a ship with power routing (js/battle.js buildShip), where the bridge runs on its backup supply.

const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');
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
function buildR1(ctx, temperatures = {}) {
  const edge = ctx.tiers.T1.edge;
  const world = createWorld({ params: ctx.params, edge, dt: ctx.dt, grid: ctx.tiers.T1.grid });
  for (const r of R1_ROOMS) addRoom(world, r.type, { id: r.id, cell: r.cell, rotation: r.rotation || 0, temperature: temperatures[r.id] ?? ctx.fixed.restTemperature.value });
  for (const [type, room, cell, side] of R1_FITTINGS) addFitting(world, type, room, cell, side);
  const room = (id) => world.rooms.find((r) => r.id === id);
  loadMagazine(world, room('magazine'), { heMass: ctx.scaled(ctx.params.magazine.capacity, edge) });
  loadTurret(room('turret'), ctx.params.turret.readyRounds.value);
  room('turret').turret.hold = true;
  enableShip(world);
  return { world, room };
}
const OTHERS = R1_ROOMS.map((r) => r.id).filter((id) => id !== 'bridge');

export default {
  id: 'L3.control.bridge.v2',
  level: 'L3',
  laws: ['an overheated (shut down) or switched-off bridge gives no control: every room loses control and the reactor SCRAMs (#185 (6), #189 (3), 13f.1)', 'the bridge itself reports its loss of control, with cause overheat or off (#257 Q2)', 'the bridge runs on its own backup supply, never on the reactors\' routed power (#147, js/rooms.js routing)'],
  dependsOn: ['L3.control.rules'],
  setup: 'R1 at T1 (13f.2), at rest: (overheated) the bridge starting at 349 K with a 2 MW test source on it (externalPower), stepped until it shuts down at crewedOverheated (350 K) and one step more; (off) the bridge switched off (setActive false) for 3 steps, then on again for 3 steps (13l.4 A8: survivors f1.ctl.bridgeShutdown and c1.thr.bridgeNoControlWhenOff of mission0/mutations/2026-10-22-b7c4290.txt); (routed) R1 as a ship with power routing on (js/battle.js buildShip), 60 steps (13l.7: survivor f1.ctl.bridgeBackup)',
  measure: '(routed) the bridge\'s energy from its backup and from the reactors after 60 steps, and its powered flag; otherwise the events: the bridge\'s shutdown and its own control-lost and control-restored with their causes; every other room\'s control-lost and the step it falls in; the reactor\'s scram',
  tolerance: 'exact (events and steps)',
  criterion: '(routed) hand-worked: the bridge draws bridge.powerDraw = 1e5 W from its backup supply, never from the reactors: after 60 steps of 1/60 s its backup energy is 1e5 W x 1 s = 1e5 J (1e-12 relative), from the reactors 0, and it is not marked powered by the routing (#147); overheated: in the step the bridge shuts down (cause heat) it emits control-lost with cause overheat, and every one of the other nine rooms emits control-lost in that same step, the reactor scram with them; off: in the first step the bridge emits its own control-lost with cause off and the nine others lose control in that step, the reactor SCRAMs; switched on again it emits control-restored with cause on and the nine regain control in that step (#185 (6), #189 (3), #257 Q2)',
  tunable: ['thermal.crewedOverheated'],
  locked: null,
  cases() {
    return [{ how: 'overheated' }, { how: 'off' }, { how: 'routed' }];
  },
  expected(ctx, c) {
    if (c.how === 'routed') return { fromBackup: 1e5 * 60 * (1 / 60), fromReactor: 0, powered: false };
    return { bridgeLost: c.how === 'overheated' ? 'overheat' : 'off', others: OTHERS.length, restored: c.how === 'off' ? 'on' : null };
  },
  run(ctx, c) {
    if (c.how === 'routed') {
      const { world, room } = buildShip(ctx.params, 'T1', { rooms: R1_ROOMS, fittings: R1_FITTINGS });
      const b = room('bridge');
      for (let i = 0; i < 60; i++) step(world);
      return { fromBackup: b.bridge.fromBackup, fromReactor: b.bridge.fromReactor, powered: b.powered };
    }
    const { world, room } = buildR1(ctx, c.how === 'overheated' ? { bridge: 349 } : {});
    const bridge = room('bridge'), ev = world.log.events;
    if (c.how === 'overheated') {
      bridge.externalPower = 2e6;
      for (let i = 0; i < 6000 && !bridge.shutdown; i++) step(world);
      step(world);
    } else {
      setActive(world, bridge, false);
      for (let i = 0; i < 3; i++) step(world);
      setActive(world, bridge, true);
      for (let i = 0; i < 3; i++) step(world);
    }
    const at = (e) => Math.round(e.t / ctx.dt);
    const shut = ev.find((e) => e.type === 'shutdown' && e.room === 'bridge'), lost = ev.find((e) => e.type === 'control-lost' && e.room === 'bridge');
    const others = ev.filter((e) => e.type === 'control-lost' && e.room !== 'bridge');
    const restored = ev.find((e) => e.type === 'control-restored' && e.room === 'bridge'), back = ev.filter((e) => e.type === 'control-restored' && e.room !== 'bridge');
    const scram = ev.find((e) => e.type === 'scram' && e.room === 'reactor');
    return {
      shutStep: shut ? at(shut) : null, bridgeLost: lost ? lost.cause : null, lostStep: lost ? at(lost) : null,
      others: [...new Set(others.map((e) => e.room))].length, othersSteps: [...new Set(others.map(at))], scramStep: scram ? at(scram) : null,
      restored: restored ? restored.cause : null, restoredStep: restored ? at(restored) : null, back: [...new Set(back.map((e) => e.room))].length, backSteps: [...new Set(back.map(at))],
    };
  },
  compare(e, a, c) {
    if (c.how === 'routed') {
      const checks = { 'the bridge on its backup: 1e5 J in 1 s (hand-worked), none from the reactors, not powered by the routing': Math.abs(a.fromBackup - e.fromBackup) <= 1e-12 * e.fromBackup && a.fromReactor === e.fromReactor && a.powered === e.powered };
      return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
    }
    const checks = {
      'the bridge emits its own control-lost with its cause': a.bridgeLost === e.bridgeLost,
      'every other room loses control in that step, the reactor SCRAMs': a.others === e.others && a.othersSteps.length === 1 && a.othersSteps[0] === a.lostStep && a.scramStep === a.lostStep,
    };
    if (c.how === 'overheated') checks['in the step the bridge shuts down'] = a.shutStep !== null && a.shutStep === a.lostStep;
    else checks['switched on: control-restored (on) for the bridge and the nine in one step'] = a.restored === e.restored && a.back === e.others && a.backSteps.length === 1 && a.backSteps[0] === a.restoredStep;
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    const a = r.actual;
    if (r.case.how === 'routed') return { expected: `backup ${r.expected.fromBackup} J, reactor 0 J, not powered`, actual: `backup ${a.fromBackup} J, reactor ${a.fromReactor} J, powered ${a.powered}` };
    return { expected: `bridge control-lost (${r.expected.bridgeLost}); ${r.expected.others} rooms lose control in that step`, actual: `bridge control-lost (${a.bridgeLost}) at step ${a.lostStep}; ${a.others} rooms at steps ${a.othersSteps.join(',')}; scram at ${a.scramStep}${a.restored ? `; restored (${a.restored}) at ${a.restoredStep}, ${a.back} rooms` : ''}` };
  },
};
