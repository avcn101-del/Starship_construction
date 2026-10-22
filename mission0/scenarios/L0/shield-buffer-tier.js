import { createWorld, addRoom, shieldRound, shieldBuffer } from '../../../js/rooms.js';
import { roundGeometry } from '../../../js/projectile.js';

// S7 of physics pass 2 (DESIGN.md 13k.4): the shield's buffer in joules, k = 3 (13k.1, #240 (4), F15). An M shield
// generator alone on the tier's grid; M rounds of that tier at its centre (strength 1), one after another between
// two steps, until the buffer cannot pay a whole stop.
const MAX = 20;

export default {
  id: 'L0.shield.buffer.tier',
  level: 'L0',
  laws: ['the shield\'s buffer scales with the energy it pays: shield.buffer k = 3 (#240 (4), 13k.1)', 'stopping rounds costs the shield\'s buffer (#139)'],
  dependsOn: [],
  setup: 'at T1-T6 an M shield generator (powered, on) alone on the tier\'s grid; M rounds of the tier (kinetic.roundMass k = 3, kinetic.muzzleVelocity) at the generator\'s centre (field strength 1), by the kernel\'s shieldRound, up to 20 (13k.4 S7)',
  measure: 'the buffer before the first round; the energy the first round cost; rounds per buffer = buffer / that energy; how many rounds were stopped in full',
  tolerance: 'rounds per buffer 1e-6 of the hand-worked 5.859375 at every tier (a ratio of two scaled constants, 13k.6); counts exact',
  criterion: 'hand-worked literal: an M round has 1.5 x the sectional momentum of an S round (kineticStop), so the field leaves v / 3 and takes 1/2 x 6 x (800^2 - (800 / 3)^2) = 1 706 666.67 J at T1; shield.buffer / that = 1e7 / 1 706 666.67 = 5.859375 (13k.3: 5.86); every tier the same within 1e-6, since the buffer (k = 3) and the round\'s energy (mass k = 3, speed k = 0) scale alike; 5 rounds stopped in full, the 6th paid in part (#139, #240 (4), #243)',
  tunable: ['shield.buffer', 'shield.kineticStop', 'kinetic.roundMass', 'kinetic.muzzleVelocity'],
  locked: { date: '2026-10-22', hash: '2840413d' },
  cases(ctx) {
    return Object.keys(ctx.tiers).map((tier) => ({ tier }));
  },
  expected() {
    return { perBuffer: 5.859375, whole: 5 };
  },
  run(ctx, c) {
    const p = ctx.params, f = ctx.fixed, edge = ctx.tiers[c.tier].edge;
    const world = createWorld({ params: p, edge, dt: ctx.dt, grid: ctx.tiers[c.tier].grid });
    const gen = addRoom(world, 'shieldGenerator', { id: 'shield', cell: [2, 2] });
    const m = ctx.scaled(p.kinetic.roundMass, edge), v = ctx.scaled(p.kinetic.muzzleVelocity, edge), { A } = roundGeometry(m, f.steelDensity.value, f.roundLengthToDiameter.value);
    const buffer = shieldBuffer(world, gen), costs = [];
    let whole = 0, stopped = null;
    for (let i = 0; i < MAX; i++) {
      const r = shieldRound(world, { position: gen.position, mass: m, velocity: v, area: A });
      costs.push(r.energy);
      if (stopped === null) stopped = r.velocity;
      if (r.velocity === stopped) whole++; else break;
    }
    return { buffer, energy: costs[0], perBuffer: buffer / costs[0], whole };
  },
  compare(e, a) {
    const checks = { 'rounds per buffer 5.859375 within 1e-6': Math.abs(a.perBuffer - e.perBuffer) <= 1e-6 * e.perBuffer, 'rounds stopped in full': a.whole === e.whole };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n).join(', ') };
  },
  display(r) {
    return { expected: `${r.expected.perBuffer} rounds per buffer, ${r.expected.whole} stopped in full`, actual: `buffer ${(r.actual.buffer / 1e6).toFixed(6)} MJ, cost ${(r.actual.energy / 1e6).toFixed(9)} MJ, ${r.actual.perBuffer.toFixed(9)} per buffer, ${r.actual.whole} in full` };
  },
};
