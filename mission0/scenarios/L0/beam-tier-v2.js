import { createWorld, addRoom, beamEnergy } from '../../../js/rooms.js';
import { beamDeposit, csdaRange } from '../../../js/damage.js';

// S6 of physics pass 2 under #249 (DESIGN.md 13k.1, 13k.4): beam depth tier-invariant for electronic stopping only.
// Successor of L0.beam.tier (withdrawn, #248). The L0 lock hashes cases, expected, compare and invariants but not
// helpers (#175), so the scenario's own Bethe integration and bisection live inside expected(). Armour columns of
// 8 cells, sigma = armour.cellMass at the tier / edge^2.
//
// Hand-worked literal (T1, N = 2): E = beam.gradient x N x edge = 10 MeV/m x 2 x 5 m = 100 MeV. An armour cell is
// 1e4 kg over 5 m x 5 m = 400 kg/m^2. The CSDA range of a 100 MeV proton in iron by the Bethe formula of 13i.1
// (13k.3's estimate) is 0.282 armour cells = 0.282 x 400 = 112.8 kg/m^2; checked within 1 %.
const CELLS = 8;

export default {
  id: 'L0.beam.tier.v2',
  level: 'L0',
  laws: ['a beam bay of N cells reaches the same CSDA depth in armour cells at every tier; the deposit profile\'s drift from nuclear interactions is real and reported (#249, 13k.1)', 'a neutral particle beam leaves its energy along its path (#229)'],
  dependsOn: [],
  setup: 'N = 2 and N = 8 beam bays (the kernel\'s beamEnergy at the tier) into a column of 8 armour cells (sigma = armour.cellMass at the tier / edge^2) at T1-T6: the kernel\'s csdaRange and beamDeposit (13k.4 S6 under #249)',
  measure: 'the particle energy; the depth in cells = CSDA range / sigma; the fraction left in the first cell and the fraction that exits the 8 cells (printed only)',
  tolerance: 'the depth identical across tiers within 1e-9 relative (the kernel\'s bisection to 1e-12 on its own csdaRange); the T1 energy against gradient x N x edge 1e-12 (closed form); the kernel against the scenario\'s own integration: energy and depth 1e-3 relative (the integrators\' steps differ: 2 kg/m^2 and 1 % against 0.2 kg/m^2 and 0.1 %); the T1 literal 1 %',
  criterion: 're-statement: the scenario\'s own Bethe integration (13i.1: iron, no shell or density correction; steps at most 0.2 kg/m^2 and 0.1 % of the energy, 10x finer than the kernel\'s) gives the T1 range R1 of E1 = beam.gradient x N x 5 m and, by its own bisection to 1e-12, the energy E at the tier whose range is R1 x sigma(tier) / sigma(T1); the kernel\'s energy and depth within 1e-3 of these; the kernel\'s depth csdaRange(E) / sigma identical across T1-T6 within 1e-9 for N = 2 and N = 8; at T1 the kernel\'s energy = gradient x N x edge within 1e-12; hand-worked literal: T1 N = 2, 100 MeV and 0.282 armour cells (112.8 kg/m^2) within 1 %. Reported, not checked: the first-cell and exit fractions per tier (measured drift for N = 8: F_1 0.431 at T1 to 0.882 at T6, nuclear interactions over ironInteractionLength; #248, #249)',
  tunable: ['beam.gradient', 'armour.cellMass'],
  locked: { date: '2026-10-22', hash: '9de7d2e2' },
  cases(ctx) {
    const out = [];
    for (const N of [2, 8]) for (const tier of Object.keys(ctx.tiers)) out.push({ N, tier });
    return out;
  },
  expected(ctx, c) {
    const f = ctx.fixed, p = ctx.params, edge = ctx.tiers[c.tier].edge;
    const Mp = f.protonRestEnergy.value, me = f.electronRestEnergy.value, KZA = f.betheK.value * f.ironZOverA.value, I = f.ironMeanExcitation.value;
    function bethe(E) {
      const g = 1 + E / Mp, b2 = 1 - 1 / (g * g), bg2 = b2 * g * g, q = me / Mp, tMax = (2 * me * bg2) / (1 + 2 * g * q + q * q);
      return (KZA / b2) * (0.5 * Math.log((2 * me * bg2 * tMax) / (I * I)) - b2);
    }
    const stopE = 0.5 * 1.602176634e-13; // J, 0.5 MeV
    function range(E) {
      let x = 0;
      for (;;) {
        const h = Math.min(0.2, (0.001 * E) / bethe(E));
        const k1 = -bethe(E), k2 = -bethe(E + (h / 2) * k1), k3 = -bethe(E + (h / 2) * k2), k4 = -bethe(E + h * k3);
        const next = E + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
        x += h;
        if (!(next >= stopE)) return x;
        E = next;
      }
    }
    const sigma = (e) => ctx.scaled(p.armour.cellMass, e) / (e * e);
    const E1 = p.beam.gradient.value * c.N * ctx.baseEdge, R1 = range(E1), target = R1 * (sigma(edge) / sigma(ctx.baseEdge));
    let lo = E1, hi = E1, E = E1;
    if (range(lo) !== target) {
      while (range(hi) < target) { lo = hi; hi *= 2; }
      while (hi - lo > 1e-12 * hi) { const mid = (lo + hi) / 2; if (range(mid) < target) lo = mid; else hi = mid; }
      E = (lo + hi) / 2;
    }
    return { E1, E, depth: R1 / sigma(ctx.baseEdge), literal: c.tier === 'T1' && c.N === 2 ? { E: 100 * 1.602176634e-13, range: 112.8, depth: 0.282 } : null };
  },
  run(ctx, c) {
    const f = ctx.fixed, p = ctx.params, edge = ctx.tiers[c.tier].edge;
    const world = createWorld({ params: p, edge, dt: ctx.dt });
    const E = beamEnergy(world, addRoom(world, 'beamBay', { id: 'bay', length: c.N }));
    const consts = { protonRest: f.protonRestEnergy.value, electronRest: f.electronRestEnergy.value, K: f.betheK.value, ZA: f.ironZOverA.value, I: f.ironMeanExcitation.value, lambda: f.ironInteractionLength.value };
    const sigma = ctx.scaled(p.armour.cellMass, edge) / (edge * edge);
    const d = beamDeposit(E, new Array(CELLS).fill(sigma), consts), range = csdaRange(E, consts);
    return { E, range, depth: range / sigma, F1: d.fractions[0], exit: d.exit };
  },
  compare(e, a, c) {
    const rel = (x, y, t) => Number.isFinite(y) && Math.abs(x - y) <= t * Math.abs(x);
    const checks = {
      'energy within 1e-3 of the own bisection': rel(e.E, a.E, 1e-3),
      'depth within 1e-3 of the own integration': rel(e.depth, a.depth, 1e-3),
      ...(c.tier === 'T1' ? { 'T1 energy = gradient x N x edge within 1e-12': rel(e.E1, a.E, 1e-12) } : {}),
      ...(e.literal ? { 'hand-worked literal: 100 MeV (1e-12), 112.8 kg/m^2 and 0.282 cells within 1 %': rel(e.literal.E, a.E, 1e-12) && rel(e.literal.range, a.range, 0.01) && rel(e.literal.depth, a.depth, 0.01) } : {}),
    };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n).join(', ') };
  },
  invariants(ctx, rows) {
    const same = [2, 8].every((N) => {
      const ref = rows.find((r) => r.case.N === N && r.case.tier === 'T1').actual.depth;
      return rows.filter((r) => r.case.N === N).every((r) => Math.abs(r.actual.depth - ref) <= 1e-9 * Math.abs(ref));
    });
    return [{ name: 'the kernel\'s CSDA depth in armour cells identical across T1-T6 within 1e-9, N = 2 and 8', ok: same }];
  },
  display(r) {
    const mev = (x) => (x / 1.602176634e-13).toFixed(6);
    return {
      expected: `E ${mev(r.expected.E)} MeV, depth ${r.expected.depth.toFixed(9)} cells (own integration)`,
      actual: `E ${mev(r.actual.E)} MeV, range ${r.actual.range.toFixed(4)} kg/m^2, depth ${r.actual.depth.toPrecision(15)} cells; reported: F_1 ${r.actual.F1.toFixed(4)}, exit ${r.actual.exit.toFixed(4)}`,
    };
  },
};
