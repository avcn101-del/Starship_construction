// damage.js — what damage channels do to cells: kinetic penetration,
// blast spreading through shared walls, beam burn-through.
// Every function here keeps exact books: what goes in = absorbed + left over.

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
 * the rest escapes to space. Returns per-cell absorption and the escape.
 */
export function blast(w, h, origin, E, capacity) {
  const idx = (x, y) => y * w + x;
  const absorbed = new Float64Array(w * h);
  const inRegion = new Uint8Array(w * h); // cells the blast has reached
  let excess = E;
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
  return { absorbed: Array.from(absorbed), escaped: excess, inRegion: Array.from(inRegion) };
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
