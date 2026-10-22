import { createWorld, addRoom, enableShip, loadTurret, step } from '../../../js/rooms.js';

// S15 of physics pass 2 (DESIGN.md 13k.4): the launch time (13k.1, F20). A ship at T1 of an M bridge at (0, 0) and an
// M turret at (2, 0) (the turret needs control, so the smallest ship), at rest; the turret, its ready store full,
// aimed +x, fires freely at turret.fireRate 0.7 /s (a run-time value inside its approved 0.2-2, so that its second
// shot falls inside a step: 1 / 0.7 s = 85.714 steps).
const RATE = 0.7; // 1/s
const SHOT = 2;
const cross0 = (a) => Math.hypot(a[0], a[1]);

export default {
  id: 'L1.turret.timing',
  level: 'L1',
  laws: ['a round fired at into its step is launched at world.t + at and moves (dt - at) v in its first step (F20, 13k.1)', 'recoil: ship plus rounds conserve momentum (#5)'],
  dependsOn: [],
  setup: 'at T1 a ship of an M bridge (0, 0) and an M turret (2, 0), at rest, the turret aimed +x with its 4 ready rounds, firing at turret.fireRate = 0.7 /s (run-time value, approved range 0.2-2): its first shot on the step grid, its second 1 / 0.7 s later, inside a step (13k.4 S15)',
  measure: 'the second shot\'s event time; its round\'s launch time t, its launch point x0 and its position x after the step it was fired in; its velocity',
  tolerance: 'positions 1e-9 of the step\'s path v dt (13k.4 S15); times 1e-12; the literal 1e-6',
  criterion: 're-statement: the shot is due at t_1 + 1 / rate; at = due - the start of its step; the round\'s t = the event\'s t = that step\'s start + at; after the step x - x0 = v (dt - at) (not v dt) within 1e-9 x |v| dt; hand-worked literal: 1 / 0.7 = 1.4285714 s = 85.714 steps, so at = 0.7142857 dt and the round moves 800 x (1 - 0.7142857) / 60 = 3.8095 m in its first step (1e-6) (F20, #243)',
  tunable: ['turret.fireRate', 'kinetic.muzzleVelocity'],
  locked: null,
  cases() {
    return [{ shot: SHOT, rate: RATE }];
  },
  expected(ctx, c) {
    const dt = ctx.dt, first = 0, due = first + (c.shot - 1) / c.rate, k = Math.floor(due / dt), at = due - k * dt;
    return { due, at, start: k * dt, move: ctx.params.kinetic.muzzleVelocity.value * (dt - at), literal: 3.8095238095, dt };
  },
  run(ctx, c) {
    const params = JSON.parse(JSON.stringify(ctx.params));
    params.turret.fireRate.value = c.rate;
    const world = createWorld({ params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    addRoom(world, 'bridge', { id: 'bridge', cell: [0, 0] });
    const turret = addRoom(world, 'turret', { id: 'turret', cell: [2, 0] });
    loadTurret(turret, params.turret.readyRounds.value);
    turret.turret.aim = [1, 0];
    enableShip(world);
    const cause = `turret:shot-${c.shot}`;
    let found = null;
    while (!found && world.t < 10) {
      const t0 = world.t;
      step(world);
      const r = world.ship.rounds.find((x) => x.cause === cause);
      if (r) found = { start: t0, t: r.t, x0: [...r.x0], x: [...r.x], v: [...r.v] };
    }
    const ev = world.log.events.find((e) => e.type === 'shot' && e.cause === cause);
    return { ...found, event: ev ? ev.t : null, move: found ? cross0([found.x[0] - found.x0[0], found.x[1] - found.x0[1]]) : null, speed: found ? cross0(found.v) : null };
  },
  compare(e, a) {
    const close = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.max(Math.abs(x), Math.abs(y));
    const checks = {
      'fired in the step that contains its due time': close(e.start, a.start, 1e-12) || (e.start === 0 && a.start === 0),
      'launched at the step start + at (round and event)': close(e.start + e.at, a.t, 1e-12) && a.t === a.event,
      'moves (dt - at) v in its first step': Math.abs(a.move - (a.speed * (e.dt - e.at))) <= 1e-9 * a.speed * e.dt,
      'hand-worked literal 3.8095 m': close(e.literal, a.move, 1e-6),
    };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n).join(', ') };
  },
  display(r) {
    return { expected: `due ${r.expected.due.toFixed(9)} s, at ${(r.expected.at / r.expected.dt).toFixed(9)} dt, first move ${r.expected.move.toFixed(9)} m`, actual: `fired at ${r.actual.t === undefined ? '-' : r.actual.t.toFixed(9)} s (event ${r.actual.event}), first move ${r.actual.move === null ? '-' : r.actual.move.toFixed(9)} m at ${r.actual.speed === null ? '-' : r.actual.speed.toFixed(6)} m/s` };
  },
};
