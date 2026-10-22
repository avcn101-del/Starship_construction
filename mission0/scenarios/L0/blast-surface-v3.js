import { blast } from '../../../js/damage.js';

export default {
  id: 'L0.blast.surface.v3',
  level: 'L0',
  laws: ['blast through shared walls', 'energy conservation'],
  dependsOn: [],
  setup: 'an HE warhead detonating on the edge cell of an armour plate (10x10, and 2x2 to test venting), energies from 0.25x to 2.5x the M warhead',
  measure: 'energy absorbed by the plate, energy escaped, cells damaged',
  tolerance: 'energy relative 1e-9; cell counts as inequalities',
  criterion: 'absorbed = min(E, N B); escaped = max(0, E - N B); at least ceil(min(E, N B) / B) cells damaged; the damaged region is connected and contains the burst; the burst cell is destroyed whenever E >= B (#18, #141) Successor of L0.blast.surface (#240, #243, 13k.4 S16): B = matter.blastPerKg x armour.cellMass (1 MJ at T1, the same as armour.blastResistance was) in place of the removed armour.blastResistance; nothing else changes.',
  tunable: ['he.blastEnergy', 'matter.blastPerKg', 'armour.cellMass'],
  locked: null,
  cases() {
    return [
      { w: 10, h: 10, x: 0, y: 5, times: 0.25 },
      { w: 10, h: 10, x: 0, y: 5, times: 0.5 },
      { w: 10, h: 10, x: 0, y: 5, times: 1 },
      { w: 10, h: 10, x: 0, y: 5, times: 1.5 },
      { w: 10, h: 10, x: 0, y: 5, times: 2.5 },
      { w: 2, h: 2, x: 0, y: 0, times: 2.5 },
    ];
  },
  expected(ctx, c) {
    const E = ctx.params.he.blastEnergy.value * c.times;
    const B = ctx.params.matter.blastPerKg.value * ctx.params.armour.cellMass.value; // q_b x the armour cell's mass (#240 (6))
    const cap = c.w * c.h * B;
    return { absorbed: Math.min(E, cap), escaped: Math.max(0, E - cap), minDamaged: Math.ceil(Math.min(E, cap) / B - 1e-9), originDestroyed: E >= B };
  },
  run(ctx, c) {
    const E = ctx.scaled(ctx.params.he.blastEnergy) * c.times;
    const B = ctx.params.matter.blastPerKg.value * ctx.scaled(ctx.params.armour.cellMass);
    const r = blast(c.w, c.h, [c.x, c.y], E, B, 1);
    const damaged = r.absorbed.map((a, i) => (a > 0 ? i : -1)).filter((i) => i >= 0);
    // connectivity of the damaged cells, from the burst cell
    const set = new Set(damaged), seen = new Set([c.y * c.w + c.x]), stack = [c.y * c.w + c.x];
    while (stack.length) {
      const i = stack.pop(), x = i % c.w, y = Math.floor(i / c.w);
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const j = ny * c.w + nx;
        if (nx >= 0 && ny >= 0 && nx < c.w && ny < c.h && set.has(j) && !seen.has(j)) { seen.add(j); stack.push(j); }
      }
    }
    return {
      absorbed: r.absorbed.reduce((x, y) => x + y, 0), escaped: r.escaped, damaged: damaged.length,
      connected: seen.size === damaged.length, originDestroyed: r.absorbed[c.y * c.w + c.x] >= B * (1 - 1e-12),
      input: E,
    };
  },
  compare(e, a) {
    const ok = Math.abs(e.absorbed - a.absorbed) <= 1e-9 * a.input && Math.abs(e.escaped - a.escaped) <= 1e-9 * a.input
      && a.damaged >= e.minDamaged && a.connected && a.originDestroyed === e.originDestroyed;
    return { pass: ok };
  },
  invariants(ctx, rows) {
    return [{ name: 'energy in = absorbed + escaped', ok: rows.every((r) => Math.abs(r.actual.input - r.actual.absorbed - r.actual.escaped) <= 1e-9 * r.actual.input) }];
  },
  display(r) {
    const mj = (x) => (x / 1e6).toFixed(3) + ' MJ';
    return {
      expected: `absorbed ${mj(r.expected.absorbed)}, escaped ${mj(r.expected.escaped)}, >= ${r.expected.minDamaged} cells`,
      actual: `absorbed ${mj(r.actual.absorbed)}, escaped ${mj(r.actual.escaped)}, ${r.actual.damaged} cells${r.actual.connected ? '' : ' NOT CONNECTED'}`,
    };
  },
};
