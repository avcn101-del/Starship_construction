import { shieldStrength, stopRound } from '../../../js/field.js';
import { roundGeometry } from '../../../js/projectile.js';

export default {
  id: 'L0.shield.kinetic.v4',
  level: 'L0',
  laws: ['shield slows kinetic rounds', 'energy conservation'],
  dependsOn: ['L0.kinetic.penetration', 'L0.shield.point'],
  setup: 'S, M and L rounds at T1 crossing an M shield field at the generator (full strength), with shield.kineticStop swept from its approved minimum (0.5x) to its maximum (2x)',
  measure: 'exit velocity and the energy the shield pays',
  tolerance: 'relative 1e-9; the S round at 1x must stop exactly (velocity 0)',
  criterion: 'ds = min(s0, stop); v1 = v0 (s0 - ds) / s0; energy = m (v0^2 - v1^2) / 2, limited by the buffer (shield.buffer); with the computed kineticStop (1x) an S round is stopped exactly; an S round is stopped only at >= 1x; for each size the exit velocity is non-increasing as kineticStop rises (#171, #176) Successor of L0.shield.kinetic.v2 (#240, #243, 13k.4 S16): the buffer is shield.buffer (1e7 J at T1, the same as budget x bufferSeconds was) in place of the removed shield.bufferSeconds; nothing else changes.',
  tunable: ['shield.kineticStop', 'shield.budget', 'shield.buffer'],
  locked: { date: '2026-10-22', hash: '76abfc09' },
  cases(ctx) {
    const p = ctx.params.shield.kineticStop;
    const sweep = [p.min / p.value, 0.75, 0.9, 1, 1.1, 1.5, p.max / p.value];
    const out = [];
    for (const size of ['S', 'M', 'L']) for (const times of sweep) out.push({ size, times });
    return out;
  },
  expected(ctx, c) {
    const k = ctx.params.kinetic, s = ctx.params.shield;
    const m = k.roundMass.value * ctx.fixed.sizeLinear.value[c.size] ** 3, v0 = k.muzzleVelocity.value;
    const D = Math.cbrt((4 * m) / (Math.PI * ctx.fixed.steelDensity.value * ctx.fixed.roundLengthToDiameter.value));
    const A = (Math.PI * D * D) / 4, s0 = (m * v0) / A;
    const ds = Math.min(s0, s.kineticStop.value * c.times);
    let v1 = (v0 * (s0 - ds)) / s0;
    let energy = 0.5 * m * (v0 * v0 - v1 * v1);
    const buffer = s.buffer.value; // shield.buffer in joules (#240 (4))
    if (energy > buffer) { energy = buffer; v1 = Math.sqrt(v0 * v0 - (2 * buffer) / m); }
    return { velocity: v1, energy };
  },
  run(ctx, c) {
    const k = ctx.params.kinetic, s = ctx.params.shield;
    const mass = ctx.scaled(k.roundMass) * ctx.fixed.sizeLinear.value[c.size] ** 3, velocity = ctx.scaled(k.muzzleVelocity);
    const { A } = roundGeometry(mass, ctx.fixed.steelDensity.value, ctx.fixed.roundLengthToDiameter.value);
    const g = shieldStrength(0, ctx.scaled(s.radius), ctx.fixed.shieldFalloffExponent.value);
    const out = stopRound({ mass, velocity, area: A }, ctx.scaled(s.kineticStop) * c.times, g, ctx.scaled(s.buffer));
    return { velocity: out.velocity, energy: out.energy, v0: velocity };
  },
  compare(e, a) {
    return { pass: Math.abs(e.velocity - a.velocity) <= 1e-9 * a.v0 && Math.abs(e.energy - a.energy) <= 1e-9 * Math.max(1, e.energy) };
  },
  invariants(ctx, rows) {
    const s = rows.filter((r) => r.case.size === 'S');
    const falling = ['S', 'M', 'L'].every((size) => {
      const v = rows.filter((r) => r.case.size === size).sort((p, q) => p.case.times - q.case.times).map((r) => r.actual.velocity);
      return v.every((x, i) => i === 0 || x <= v[i - 1]);
    });
    return [
      { name: 'an S round is stopped exactly with the computed kineticStop (1x)', ok: s.find((r) => r.case.times === 1).actual.velocity === 0 },
      { name: 'an S round is stopped only at >= 1x', ok: s.every((r) => (r.actual.velocity === 0) === (r.case.times >= 1)) },
      { name: 'exit velocity non-increasing as kineticStop rises (each size)', ok: falling },
    ];
  },
  display(r) {
    return { expected: `v ${r.expected.velocity.toFixed(2)} m/s, ${(r.expected.energy / 1e3).toFixed(2)} kJ`, actual: `v ${r.actual.velocity.toFixed(2)} m/s, ${(r.actual.energy / 1e3).toFixed(2)} kJ` };
  },
};
