import { shieldStrength, stopRound } from '../../../js/field.js';
import { roundGeometry } from '../../../js/projectile.js';

export default {
  id: 'L0.shield.kinetic',
  level: 'L0',
  laws: ['shield slows kinetic rounds', 'energy conservation'],
  dependsOn: ['L0.kinetic.penetration', 'L0.shield.point'],
  setup: 'S, M and L rounds at T1 crossing the field of an M shield generator at 0, 40 and 120 m',
  measure: 'exit velocity and the energy the shield pays (and turns into heat)',
  tolerance: 'relative 1e-9',
  criterion: 'ds = min(s0, stop g(r)); v1 = v0 (s0 - ds) / s0; energy = m (v0^2 - v1^2) / 2, limited by the buffer (budget x bufferSeconds); heat = energy; an S round is stopped completely at full strength (#21, #139, #166)',
  tunable: ['shield.kineticStop', 'shield.radius', 'shield.budget', 'shield.bufferSeconds'],
  locked: null,
  cases() {
    const out = [];
    for (const size of ['S', 'M', 'L']) for (const r of [0, 40, 120]) out.push({ size, r });
    return out;
  },
  expected(ctx, c) {
    const k = ctx.params.kinetic, s = ctx.params.shield;
    const m = k.roundMass.value * ctx.fixed.sizeLinear.value[c.size] ** 3, v0 = k.muzzleVelocity.value;
    const D = Math.cbrt((4 * m) / (Math.PI * ctx.fixed.steelDensity.value * ctx.fixed.roundLengthToDiameter.value));
    const A = (Math.PI * D * D) / 4, s0 = (m * v0) / A;
    const g = 1 / (1 + (c.r / s.radius.value) ** ctx.fixed.shieldFalloffExponent.value);
    const ds = Math.min(s0, s.kineticStop.value * g);
    let v1 = (v0 * (s0 - ds)) / s0;
    let energy = 0.5 * m * (v0 * v0 - v1 * v1);
    const buffer = s.budget.value * s.bufferSeconds.value;
    if (energy > buffer) { energy = buffer; v1 = Math.sqrt(v0 * v0 - (2 * buffer) / m); }
    return { velocity: v1, energy };
  },
  run(ctx, c) {
    const k = ctx.params.kinetic, s = ctx.params.shield;
    const mass = ctx.scaled(k.roundMass) * ctx.fixed.sizeLinear.value[c.size] ** 3, velocity = ctx.scaled(k.muzzleVelocity);
    const { A } = roundGeometry(mass, ctx.fixed.steelDensity.value, ctx.fixed.roundLengthToDiameter.value);
    const g = shieldStrength(c.r, ctx.scaled(s.radius), ctx.fixed.shieldFalloffExponent.value);
    const out = stopRound({ mass, velocity, area: A }, ctx.scaled(s.kineticStop), g, ctx.scaled(s.budget) * s.bufferSeconds.value);
    return { velocity: out.velocity, energy: out.energy, heat: out.heat, mass, v0: velocity };
  },
  compare(e, a) {
    return { pass: Math.abs(e.velocity - a.velocity) <= 1e-9 * a.v0 && Math.abs(e.energy - a.energy) <= 1e-9 * Math.max(1, e.energy) };
  },
  invariants(ctx, rows) {
    const ke = (m, v) => 0.5 * m * v * v;
    return [
      { name: 'energy paid = kinetic energy removed', ok: rows.every((r) => Math.abs(ke(r.actual.mass, r.actual.v0) - ke(r.actual.mass, r.actual.velocity) - r.actual.energy) <= 1e-6 * ke(r.actual.mass, r.actual.v0)) },
      { name: 'heat = energy paid', ok: rows.every((r) => r.actual.heat === r.actual.energy) },
      { name: 'an S round is stopped at full strength', ok: rows.find((r) => r.case.size === 'S' && r.case.r === 0).actual.velocity === 0 },
    ];
  },
  display(r) {
    return { expected: `v ${r.expected.velocity.toFixed(2)} m/s, ${(r.expected.energy / 1e3).toFixed(2)} kJ`, actual: `v ${r.actual.velocity.toFixed(2)} m/s, ${(r.actual.energy / 1e3).toFixed(2)} kJ` };
  },
};
