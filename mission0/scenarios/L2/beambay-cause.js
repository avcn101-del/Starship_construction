import { createWorld, addRoom, setDemand, setActive, enablePowerRouting, step } from '../../../js/rooms.js';

// S13 of physics pass 2 (DESIGN.md 13k.4): an overheated beam bay under power routing reports beam-stopped with cause
// heat (#227 Q9, 13k.1). In a cluster at T1: an M reactor at (0, 2), an M hold at (2, 2), an M beam bay (N = 2) at
// (4, 2), joined in a row; power is routed (the bay draws through the hold); the bay fires at full.
const LIMIT = 1200; // s
const notes = (checks) => Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k).join(', ');

export default {
  id: 'L2.beambay.cause',
  level: 'L2',
  laws: ['an overheated room shuts down (#182)', 'every effect carries its cause (#156): a beam stopped by heat says heat (#227 Q9)'],
  dependsOn: [],
  setup: 'in a cluster at T1 an M reactor (0, 2) at full demand, an M hold (2, 2) and an M beam bay N = 2 (4, 2) firing, power routing on; (heat) until the bay overheats; (no-power) the same with the reactor switched off from the start (13k.4 S13)',
  measure: 'the bay\'s first beam-stopped event (time and cause) and its shutdown event',
  tolerance: 'exact',
  criterion: '(heat) the bay\'s first beam-stopped event has cause \'heat\' and comes at its shutdown (the same time), not \'no-power\' (#227 Q9: an overheated bay under routing asks for no power); (no-power) a bay with no reactor able to supply it stops at once with cause \'no-power\' (#156, #227, #243)',
  tunable: [],
  locked: { date: '2026-10-22', hash: 'ed63a1be' },
  cases() {
    return [{ part: 'heat' }, { part: 'no-power' }];
  },
  expected(ctx, c) {
    return { cause: c.part === 'heat' ? 'heat' : 'no-power', atShutdown: c.part === 'heat' };
  },
  run(ctx, c) {
    const world = createWorld({ params: ctx.params, dt: ctx.dt, grid: ctx.tiers.T1.grid });
    const reactor = addRoom(world, 'reactor', { id: 'reactor', cell: [0, 2] });
    addRoom(world, 'hold', { id: 'hold', cell: [2, 2] });
    const bay = addRoom(world, 'beamBay', { id: 'bay', cell: [4, 2], length: 2 });
    enablePowerRouting(world, ['bay']);
    setDemand(world, reactor, 1);
    if (c.part === 'no-power') setActive(world, reactor, false);
    bay.beamBay.firing = true;
    const stopped = () => world.log.events.find((e) => e.type === 'beam-stopped' && e.room === 'bay');
    while (!stopped() && world.t < LIMIT) step(world);
    const s = stopped(), shut = world.log.events.find((e) => e.type === 'shutdown' && e.room === 'bay');
    return { cause: s ? s.cause : null, t: s ? s.t : null, shutdown: shut ? shut.t : null };
  },
  compare(e, a) {
    const checks = { cause: a.cause === e.cause, ...(e.atShutdown ? { 'at the shutdown': a.t !== null && a.t === a.shutdown } : {}) };
    return { pass: Object.values(checks).every(Boolean), note: notes(checks) };
  },
  display(r) {
    return { expected: `beam-stopped cause ${r.expected.cause}`, actual: `beam-stopped cause ${r.actual.cause} at ${r.actual.t === null ? '-' : r.actual.t.toFixed(4)} s; shutdown ${r.actual.shutdown === null ? '-' : r.actual.shutdown.toFixed(4)} s` };
  },
};
