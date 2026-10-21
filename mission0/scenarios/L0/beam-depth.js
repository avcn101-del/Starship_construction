import { beamDeposit, csdaRange } from '../../../js/damage.js';

// The L0 lock hashes cases, expected, compare and invariants but not helpers (#175), so the scenario's own Bethe
// integration lives inside expected(). Energies come from data.js: E = beam.gradient x the bay's length (#234):
// 10, 20, 40 m give 100, 200, 400 MeV at the base gradient.
const CELLS = 8;

export default {
  id: 'L0.beam.depth',
  level: 'L0',
  laws: ['a neutral particle beam leaves its energy along its path, most near the end of its range (#229)', 'for the beam only mass counts (#230 (4))', 'energy conservation'],
  dependsOn: [],
  setup: 'the kernel\'s beamDeposit for protons of E = beam.gradient x 10, 20, 40 m (100, 200, 400 MeV) into 8 armour cells at T1 (sigma = armour.cellMass / edge^2, 400 kg/m^2); 40 m into 8 crew cells at T1 (cellMass.crewed, 592 kg/m^2); 40 m into 8 armour cells at T6 (2400 kg/m^2); 40 m into 8 armour cells at T1 with cell 1 a hole (sigma 0); and the kernel\'s csdaRange of a 20 m (200 MeV) proton in iron (13i.4 P6)',
  measure: 'the fraction F_i of the beam\'s power left in each cell and the fraction that leaves; the CSDA range',
  tolerance: 'F_i 1e-3 absolute against the scenario\'s own integration (its step at most 1/10 of the kernel\'s); sum F_i + exit = 1 within 1e-9; the hole\'s shift 1e-12 absolute; the CSDA range 1 % relative',
  criterion: 'F_i = (N E at the cell\'s entry - N E at its exit) / E0 with N = exp(-X / ironInteractionLength) and E(X) by the Bethe formula of 13i.1 (iron: ironZOverA, ironMeanExcitation; no shell or density correction), integrated by the scenario itself with steps at most 0.2 kg/m^2 and 0.1 % of the energy (the kernel: 2 kg/m^2 and 1 %), within 1e-3 absolute (estimates in armour at T1: 100 and 200 MeV all in cell 1; 400 MeV 0.431 / 0.299 / 0.269; in crew cells 0.587 / 0.413; at T6 all in cell 1); sum F_i + exit = 1 within 1e-9; with cell 1 a hole F_1 = 0 and F_(i+1) equals the intact F_i (1e-12); the CSDA range of a 200 MeV proton in iron is 373 kg/m^2 within 1 % (37.3 g/cm^2, #229, #231, #235)',
  tunable: ['beam.gradient', 'armour.cellMass', 'cellMass.crewed'],
  locked: { date: '2026-10-21', hash: 'bfc967a1' },
  cases() {
    return [
      { length: 10, matter: 'armour', tier: 'T1' }, { length: 20, matter: 'armour', tier: 'T1' }, { length: 40, matter: 'armour', tier: 'T1' },
      { length: 40, matter: 'crewed', tier: 'T1' }, { length: 40, matter: 'armour', tier: 'T6' }, { length: 40, matter: 'armour', tier: 'T1', hole: true },
      { csda: 20 },
    ];
  },
  expected(ctx, c) {
    const f = ctx.fixed, p = ctx.params;
    const Mp = f.protonRestEnergy.value, me = f.electronRestEnergy.value, KZA = f.betheK.value * f.ironZOverA.value, I = f.ironMeanExcitation.value, lam = f.ironInteractionLength.value;
    // Bethe (13i.1) written out: dE/dX in J m^2/kg.
    function bethe(E) {
      const g = 1 + E / Mp, b2 = 1 - 1 / (g * g), bg2 = b2 * g * g, q = me / Mp, tMax = (2 * me * bg2) / (1 + 2 * g * q + q * q);
      return (KZA / b2) * (0.5 * Math.log((2 * me * bg2 * tMax) / (I * I)) - b2);
    }
    // RK4 in areal density, steps at most 0.2 kg/m^2 and 0.1 % of the energy; below 0.5 MeV the proton has stopped.
    const stopE = 0.5 * 1.602176634e-13; // J, 0.5 MeV
    function cross(E, X) {
      let x = 0;
      while (x < X && E > 0) {
        const h = Math.min(X - x, 0.2, (0.001 * E) / bethe(E));
        const k1 = -bethe(E), k2 = -bethe(E + (h / 2) * k1), k3 = -bethe(E + (h / 2) * k2), k4 = -bethe(E + h * k3);
        const next = E + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
        x += h;
        if (!(next >= stopE)) return { E: 0, at: x };
        E = next;
      }
      return { E, at: null };
    }
    if (c.csda) return { range: 373, own: cross(p.beam.gradient.value * c.csda, Infinity).at };
    const edge = ctx.tiers[c.tier].edge, E0 = p.beam.gradient.value * c.length;
    const sigma = ctx.scaled(c.matter === 'armour' ? p.armour.cellMass : p.cellMass.crewed, edge) / (edge * edge);
    const sigmas = Array.from({ length: 8 }, (_, i) => (c.hole && i === 0 ? 0 : sigma));
    let E = E0, X = 0, prev = 1;
    const F = [];
    for (const s of sigmas) {
      if (s > 0 && E > 0) E = cross(E, s).E;
      X += s;
      const left = E > 0 ? (Math.exp(-X / lam) * E) / E0 : 0;
      F.push(prev - left);
      prev = left;
    }
    return { E0, sigmas, F, exit: prev };
  },
  run(ctx, c) {
    const f = ctx.fixed, p = ctx.params;
    const consts = { protonRest: f.protonRestEnergy.value, electronRest: f.electronRestEnergy.value, K: f.betheK.value, ZA: f.ironZOverA.value, I: f.ironMeanExcitation.value, lambda: f.ironInteractionLength.value };
    if (c.csda) return { range: csdaRange(p.beam.gradient.value * c.csda, consts) };
    const edge = ctx.tiers[c.tier].edge, sigma = ctx.scaled(c.matter === 'armour' ? p.armour.cellMass : p.cellMass.crewed, edge) / (edge * edge);
    const sigmas = Array.from({ length: CELLS }, (_, i) => (c.hole && i === 0 ? 0 : sigma));
    const d = beamDeposit(p.beam.gradient.value * c.length, sigmas, consts);
    return { F: d.fractions, exit: d.exit, sum: d.fractions.reduce((x, y) => x + y, 0) + d.exit };
  },
  compare(e, a, c) {
    if (c.csda) {
      const ok = Number.isFinite(a.range) && Math.abs(a.range - e.range) <= 0.01 * e.range;
      return { pass: ok, note: ok ? '' : 'CSDA range' };
    }
    const checks = {
      'F_i against the own integration, 1e-3 absolute': a.F.length === e.F.length && e.F.every((x, i) => Math.abs(x - a.F[i]) <= 1e-3) && Math.abs(e.exit - a.exit) <= 1e-3,
      'sum F_i + exit = 1 within 1e-9': Math.abs(a.sum - 1) <= 1e-9,
    };
    return { pass: Object.values(checks).every(Boolean), note: Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n).join(', ') };
  },
  invariants(ctx, rows) {
    const intact = rows.find((r) => r.case.length === 40 && r.case.matter === 'armour' && r.case.tier === 'T1' && !r.case.hole).actual;
    const hole = rows.find((r) => r.case.hole).actual;
    return [{ name: 'a hole in cell 1 shifts the whole profile one cell deeper (F_1 = 0, F_(i+1) = intact F_i, 1e-12)', ok: hole.F[0] === 0 && intact.F.slice(0, 7).every((x, i) => Math.abs(x - hole.F[i + 1]) <= 1e-12) }];
  },
  display(r) {
    if (r.case.csda) return { expected: `CSDA range ${r.expected.range} kg/m^2 (own integration ${r.expected.own.toFixed(3)})`, actual: `CSDA range ${r.actual.range.toFixed(3)} kg/m^2` };
    const f = (x) => `F [${x.F.map((y) => y.toFixed(5)).join(' ')}] exit ${x.exit.toFixed(5)}`;
    return { expected: `E ${(r.expected.E0 / 1.602176634e-13).toFixed(1)} MeV, sigma ${r.expected.sigmas[1].toFixed(1)}: ${f(r.expected)}`, actual: `${f(r.actual)}; sum - 1 = ${(r.actual.sum - 1).toExponential(2)}` };
  },
};
