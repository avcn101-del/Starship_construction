// damage.js — what damage channels do to cells: kinetic penetration,
// blast spreading through shared walls, beam burn-through, and the path
// model (DESIGN.md 13i): the round damaged by what it meets (#228, #230) and
// the neutral particle beam's energy loss along its path (#229).
// Every function here keeps exact books: what goes in = absorbed + left over.
// penetrate and burnThrough are superseded by penetrateRound and beamDeposit
// (#230); they stay for the withdrawn L0 scenarios (13i.1).

/**
 * Kinetic penetration along a path of cells (#137, #165).
 * s0: sectional momentum of the round; resistances: per cell along the path.
 * A cell takes up to its resistance; the round stops in the cell that takes
 * the rest. Returns cells fully passed, the cell it stopped in (-1 if it
 * left the path), what each cell absorbed, and the residual on exit.
 */
export function penetrate(s0, resistances) {
  let s = s0;
  const absorbed = [];
  for (let i = 0; i < resistances.length; i++) {
    const r = resistances[i];
    if (s > r) {
      absorbed.push(r);
      s -= r;
    } else {
      absorbed.push(s);
      return { passed: i, stoppedIn: i, residual: 0, absorbed };
    }
  }
  return { passed: resistances.length, stoppedIn: -1, residual: s, absorbed };
}

/**
 * Blast on a rectangular plate of w x h cells, detonating in cell `origin`
 * ([x, y]) with energy E; every cell absorbs up to `capacity` (J).
 * Excess flows from the damaged region to its unsaturated neighbours in
 * proportion to the shared wall length (#18, #141); with no neighbour left
 * the rest escapes to space. `coupling` is the fraction of E that enters
 * the hull at a contact burst on an open face; the rest vents to space
 * there (#169, #176). It is required (#184); 1 means all of E enters the
 * plate. Returns per-cell absorption, the escape and the vent.
 */
export function blast(w, h, origin, E, capacity, coupling) {
  if (typeof coupling !== 'number') throw new Error('blast(): the coupling argument is required (#184)');
  const idx = (x, y) => y * w + x;
  const absorbed = new Float64Array(w * h);
  const inRegion = new Uint8Array(w * h); // cells the blast has reached
  const vented = E - coupling * E;
  let excess = coupling * E;
  const take = (i, e) => {
    const a = Math.min(e, capacity - absorbed[i]);
    absorbed[i] += a;
    inRegion[i] = 1;
    return e - a;
  };
  excess = take(idx(origin[0], origin[1]), excess);
  let guard = 0;
  while (excess > 0 && guard++ < w * h * 4) {
    // Frontier: unsaturated cells touching a saturated cell of the region,
    // weighted by how many walls they share with it.
    const weight = new Map();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = idx(x, y);
        if (!inRegion[i] || absorbed[i] < capacity) continue;
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = idx(nx, ny);
          if (absorbed[j] >= capacity) continue;
          weight.set(j, (weight.get(j) || 0) + 1);
        }
      }
    }
    if (weight.size === 0) break;
    let total = 0;
    for (const v of weight.values()) total += v;
    let left = 0;
    for (const [j, v] of weight) left += take(j, (excess * v) / total);
    excess = left;
  }
  return { absorbed: Array.from(absorbed), escaped: excess, vented, inRegion: Array.from(inRegion) };
}

/**
 * Beam burn-through (#138): a beam delivers `power` (W) to a cell; the cell
 * burns through when it has received `energy` (J). Every joule delivered
 * becomes heat in the target room. Stepped at dt until burnt or maxTime
 * (the caller passes FIXED.burnTimeLimit).
 */
export function burnThrough(power, energy, dt, maxTime) {
  let delivered = 0;
  let steps = 0;
  while (delivered < energy && steps * dt < maxTime) {
    delivered += power * dt;
    steps++;
  }
  return { time: steps * dt, delivered, heat: delivered, burnt: delivered >= energy };
}

/**
 * The round rule of the path model (13i.1, #228, #230). A round of momentum
 * p0 and cross-section A0 meets cells of sectional-momentum resistance r_i
 * (0 for a hole). Its strength S is the sectional momentum that wrecks it;
 * its damage f grows by what each cell takes / S and flattens it at constant
 * volume, A = A0 / (1 - f), its momentum unchanged by f. At each cell, with
 * s = p / A on entry: if s > r and f + r / S < 1 it passes (the cell takes r,
 * p falls by r A); otherwise it stops there, the cell takes min(s, r), f
 * grows by that / S, capped at 1 (f = 1: wrecked), and its remaining p goes
 * to what it stopped in. A hole takes nothing and does nothing to the round.
 * Returns per cell the sectional momentum taken and the momentum (impulse)
 * taken; p0 = sum of impulses + momentum on exit, exactly by construction.
 */
export function penetrateRound({ momentum, area, strength }, resistances) {
  let p = momentum, f = 0, A = area;
  const taken = [], impulse = [];
  for (let i = 0; i < resistances.length; i++) {
    const r = resistances[i], s = p / A;
    if (s > r && f + r / strength < 1) {
      taken.push(r);
      impulse.push(r * A);
      p -= r * A;
      f += r / strength;
      A = area / (1 - f);
    } else {
      const t = Math.min(s, r);
      taken.push(t);
      impulse.push(p);
      f = Math.min(1, f + t / strength);
      return { passed: i, stoppedIn: i, wrecked: f >= 1, f, area: f < 1 ? area / (1 - f) : null, stopMomentum: p, momentum: 0, residual: 0, taken, impulse };
    }
  }
  return { passed: resistances.length, stoppedIn: -1, wrecked: false, f, area: A, stopMomentum: 0, momentum: p, residual: p / A, taken, impulse };
}

// ---------- the neutral particle beam (13i.1, #229) ----------
// Numerical method of the path integration (not game constants): the step in
// areal density is at most PATH_STEP_MAX and at most PATH_STEP_REL of the
// distance in which the energy would fall to zero at the current stopping
// power (so an energy change of about 1 % per step); a particle below
// STOP_ENERGY (1 MeV, a residual range of about 0.03 kg/m^2 of iron) has
// stopped. Fourth-order Runge-Kutta in areal density.
const PATH_STEP_MAX = 2; // kg/m^2, 0.5 % of a T1 cell
const PATH_STEP_REL = 0.01;
const STOP_ENERGY = 1.602176634e-13; // J, 1 MeV

/**
 * Bethe stopping power of a proton of kinetic energy E (J) in iron-equivalent
 * matter, without shell or density correction (13i.1): dE/dX in J m^2/kg.
 * c = { protonRest, electronRest, K, ZA, I } (FIXED, SI).
 */
export function betheStopping(E, c) {
  const g = 1 + E / c.protonRest, b2 = 1 - 1 / (g * g), bg2 = b2 * g * g, r = c.electronRest / c.protonRest;
  const tMax = (2 * c.electronRest * bg2) / (1 + 2 * g * r + r * r);
  return ((c.K * c.ZA) / b2) * (0.5 * Math.log((2 * c.electronRest * bg2 * tMax) / (c.I * c.I)) - b2);
}

/** A proton of energy E crossing X kg/m^2: its energy after, or 0 and where it stopped. */
function slowDown(E, X, c) {
  const dE = (e) => -betheStopping(e, c);
  let x = 0;
  while (x < X && E > 0) {
    const h = Math.min(X - x, PATH_STEP_MAX, (PATH_STEP_REL * E) / betheStopping(E, c));
    if (!(h > 0)) break;
    const k1 = dE(E), k2 = dE(E + (h / 2) * k1), k3 = dE(E + (h / 2) * k2), k4 = dE(E + h * k3);
    const next = E + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    x += h;
    if (!(next >= STOP_ENERGY)) return { E: 0, stoppedAt: x };
    E = next;
  }
  return { E, stoppedAt: null };
}

/** CSDA range (kg/m^2) of a proton of energy E in iron-equivalent matter (13i.4 P6), by the same integration. */
export function csdaRange(E, c) {
  return slowDown(E, Infinity, c).stoppedAt;
}

/**
 * The beam's energy along its path (13i.1): survivors lose energy by the
 * Bethe formula; a fraction dX / lambda of them has a nuclear interaction and
 * leaves its remaining kinetic energy in place. With N(X) = exp(-X / lambda)
 * survivors of energy E(X), cell i (areal density sigmas[i], 0 for a hole)
 * receives F_i = (N E at its entry - N E at its exit) / E0 of the beam's
 * power; what is left after the last cell leaves (`exit`), so
 * sum F_i + exit = 1. c = { protonRest, electronRest, K, ZA, I, lambda }.
 */
export function beamDeposit(E0, sigmas, c) {
  let E = E0, X = 0, prev = 1;
  const fractions = [];
  for (const sigma of sigmas) {
    if (sigma > 0 && E > 0) E = slowDown(E, sigma, c).E;
    X += sigma;
    const left = E > 0 ? (Math.exp(-X / c.lambda) * E) / E0 : 0;
    fractions.push(prev - left);
    prev = left;
  }
  return { fractions, exit: prev };
}
