// util.js — math helpers, seeded random numbers, stable hashing.
// The simulation never calls Math.random: it uses rng() streams from here.

/** Seeded PRNG (mulberry32). Returns a function giving floats in [0, 1). */
export function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** JSON with object keys sorted, so equal data always gives equal text. */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

/** 32-bit FNV-1a hash as 8 hex digits. */
export function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** Simpson's rule on [a, b] with n (even) intervals. */
export function simpson(f, a, b, n = 2000) {
  if (n % 2) n += 1;
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) sum += f(a + i * h) * (i % 2 ? 4 : 2);
  return (sum * h) / 3;
}

/**
 * Whole steps of dt needed for `duration` to have passed: duration / dt
 * rounded up, except that a quotient within 1e-9 of a whole number counts
 * as that number (10 s / (1/60 s) is 600 steps, not 601).
 */
export function stepsAtLeast(duration, dt) {
  const n = duration / dt, r = Math.round(n);
  return Math.abs(n - r) <= 1e-9 * Math.max(1, Math.abs(n)) ? r : Math.ceil(n);
}

// ---------- deterministic elementary functions (#239 Q6, DESIGN.md 13k.1) ----------
// The same bits on every JavaScript engine: Math.sin, Math.cos, Math.exp,
// Math.log and Math.pow are not specified to the last bit, and Node's V8 and a
// phone's browser disagree on some arguments, so a battle would not replay
// across engines. These are ports of fdlibm (FreeBSD msun: k_sin.c, k_cos.c,
// e_rem_pio2.c, e_exp.c, e_log.c) written with + - * /, Math.floor and the
// exponent bits read through a DataView, all exact in IEEE 754. sin and cos
// come from proto/detmath.js (prototype v2).

const SIN1 = -1.66666666666666324348e-01, SIN2 = 8.33333333332248946124e-03, SIN3 = -1.98412698298579493134e-04;
const SIN4 = 2.75573137070700676789e-06, SIN5 = -2.50507602534068634195e-08, SIN6 = 1.58969099521155010221e-10;
const COS1 = 4.16666666666666019037e-02, COS2 = -1.38888888888741095749e-03, COS3 = 2.48015872894767294178e-05;
const COS4 = -2.75573143513906633035e-07, COS5 = 2.08757232129817482790e-09, COS6 = -1.13596475577881948265e-11;
const INV_PIO2 = 6.36619772367581382433e-01;
const PIO2_1 = 1.57079632673412561417e+00, PIO2_1T = 6.07710050650619224932e-11;
const PIO2_2 = 6.07710050630396597660e-11, PIO2_2T = 2.02226624879595063154e-21;
const PIO2_3 = 2.02226624871116645580e-21, PIO2_3T = 8.47842766036889956997e-32;
const PIO4 = 7.85398163397448278999e-01;
const TRIG_LIMIT = 4e5; // beyond this many radians the three-part reduction loses digits (never reached by a heading)

function kernelSin(x, y) {
  const z = x * x, v = z * x, r = SIN2 + z * (SIN3 + z * (SIN4 + z * (SIN5 + z * SIN6)));
  return x - ((z * (0.5 * y - v * r) - y) - v * SIN1);
}
function kernelCos(x, y) {
  const z = x * x, w = z * z, r = z * (COS1 + z * (COS2 + z * COS3)) + w * w * (COS4 + z * (COS5 + z * COS6)), hz = 0.5 * z, u = 1 - hz;
  return u + (((1 - u) - hz) + (z * r - x * y));
}
/** x = n pi/2 + (y0 + y1), |y0 + y1| <= pi/4 (Cody-Waite, three parts of pi/2, every refinement applied). */
function reducePio2(x) {
  const n = Math.floor(x * INV_PIO2 + 0.5);
  let r = x - n * PIO2_1, w = n * PIO2_1T, y0 = r - w;
  let t = r; w = n * PIO2_2; r = t - w; w = n * PIO2_2T - ((t - r) - w); y0 = r - w;
  t = r; w = n * PIO2_3; r = t - w; w = n * PIO2_3T - ((t - r) - w); y0 = r - w;
  return [n, y0, (r - y0) - w];
}
/** Deterministic sine (fdlibm); |x| above 4e5 rad, NaN and infinities are not used by the kernel and throw. */
export function sin(x) {
  const a = x < 0 ? -x : x;
  if (!(a <= TRIG_LIMIT)) throw new Error(`sin(${x}): outside the deterministic range`);
  if (a < 7.450580596923828e-9) return x;
  if (a <= PIO4) return kernelSin(x, 0);
  const [n, y0, y1] = reducePio2(x), q = ((n % 4) + 4) % 4;
  return q === 0 ? kernelSin(y0, y1) : q === 1 ? kernelCos(y0, y1) : q === 2 ? -kernelSin(y0, y1) : -kernelCos(y0, y1);
}
/** Deterministic cosine (fdlibm). */
export function cos(x) {
  const a = x < 0 ? -x : x;
  if (!(a <= TRIG_LIMIT)) throw new Error(`cos(${x}): outside the deterministic range`);
  if (a < 7.450580596923828e-9) return 1;
  if (a <= PIO4) return kernelCos(x, 0);
  const [n, y0, y1] = reducePio2(x), q = ((n % 4) + 4) % 4;
  return q === 0 ? kernelCos(y0, y1) : q === 1 ? -kernelSin(y0, y1) : q === 2 ? -kernelCos(y0, y1) : kernelSin(y0, y1);
}

// The two 32-bit words of a double, through a big-endian DataView (the same on every platform).
const WORDS = new DataView(new ArrayBuffer(8));
const hiWord = (x) => { WORDS.setFloat64(0, x); return WORDS.getInt32(0); };
const loWord = (x) => { WORDS.setFloat64(0, x); return WORDS.getUint32(4); };
const withHi = (x, hi) => { WORDS.setFloat64(0, x); WORDS.setInt32(0, hi); return WORDS.getFloat64(0); };

const LN2_HI = 6.93147180369123816490e-01, LN2_LO = 1.90821492927058770002e-10, TWO54 = 1.80143985094819840000e+16;
const LG1 = 6.666666666666735130e-01, LG2 = 3.999999999940941908e-01, LG3 = 2.857142874366239149e-01, LG4 = 2.222219843214978396e-01;
const LG5 = 1.818357216161805012e-01, LG6 = 1.531383769920937332e-01, LG7 = 1.479819860511658591e-01;
/** Deterministic natural logarithm (fdlibm e_log.c). */
export function log(x) {
  let hx = hiWord(x), k = 0;
  const lx = loWord(x);
  if (hx < 0x00100000) { // x < 2^-1022
    if (((hx & 0x7fffffff) | lx) === 0) return -Infinity;
    if (hx < 0) return NaN;
    k -= 54; x *= TWO54; hx = hiWord(x); // subnormal: scale up
  }
  if (hx >= 0x7ff00000) return x + x;
  k += (hx >> 20) - 1023;
  hx &= 0x000fffff;
  const i0 = (hx + 0x95f64) & 0x100000;
  x = withHi(x, hx | (i0 ^ 0x3ff00000)); // normalise x or x / 2
  k += i0 >> 20;
  const f = x - 1.0;
  if ((0x000fffff & (2 + hx)) < 3) { // |f| < 2^-20
    if (f === 0) return k === 0 ? 0 : k * LN2_HI + k * LN2_LO;
    const R = f * f * (0.5 - 0.33333333333333333 * f);
    return k === 0 ? f - R : k * LN2_HI - ((R - k * LN2_LO) - f);
  }
  const s = f / (2.0 + f), dk = k, z = s * s, w = z * z;
  let i = hx - 0x6147a;
  const j = 0x6b851 - hx;
  const t1 = w * (LG2 + w * (LG4 + w * LG6)), t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
  i |= j;
  const R = t2 + t1;
  if (i > 0) {
    const hfsq = 0.5 * f * f;
    return k === 0 ? f - (hfsq - s * (hfsq + R)) : dk * LN2_HI - ((hfsq - (s * (hfsq + R) + dk * LN2_LO)) - f);
  }
  return k === 0 ? f - s * (f - R) : dk * LN2_HI - ((s * (f - R) - dk * LN2_LO) - f);
}

const O_THRESHOLD = 7.09782712893383973096e+02, U_THRESHOLD = -7.45133219101941108420e+02, TWOM1000 = 9.33263618503218878990e-302;
const INVLN2 = 1.44269504088896338700e+00;
const EP1 = 1.66666666666666019037e-01, EP2 = -2.77777777770155933842e-03, EP3 = 6.61375632143793436117e-05;
const EP4 = -1.65339022054652515390e-06, EP5 = 4.13813679705723846039e-08;
/** Deterministic exponential (fdlibm e_exp.c). */
export function exp(x) {
  let hx = hiWord(x);
  const xsb = (hx >>> 31) & 1;
  hx &= 0x7fffffff;
  if (hx >= 0x40862e42) { // |x| >= 709.78
    if (hx >= 0x7ff00000) return ((hx & 0xfffff) | loWord(x)) !== 0 ? x + x : xsb === 0 ? x : 0;
    if (x > O_THRESHOLD) return Infinity;
    if (x < U_THRESHOLD) return 0;
  }
  let hi = 0, lo = 0, k = 0;
  if (hx > 0x3fd62e42) { // |x| > 0.5 ln2
    if (hx < 0x3ff0a2b2) { // and |x| < 1.5 ln2
      if (x === 1) return 2.718281828459045; // e, correctly rounded (FreeBSD msun's special case)
      hi = xsb === 0 ? x - LN2_HI : x + LN2_HI; lo = xsb === 0 ? LN2_LO : -LN2_LO; k = 1 - xsb - xsb;
    } else {
      k = Math.trunc(INVLN2 * x + (xsb === 0 ? 0.5 : -0.5));
      hi = x - k * LN2_HI; // exact here
      lo = k * LN2_LO;
    }
    x = hi - lo;
  } else if (hx < 0x3e300000) { // |x| < 2^-28
    return 1 + x;
  }
  const t = x * x, c = x - t * (EP1 + t * (EP2 + t * (EP3 + t * (EP4 + t * EP5))));
  if (k === 0) return 1 - ((x * c) / (c - 2.0) - x);
  const y = 1 - ((lo - (x * c) / (2.0 - c)) - hi);
  if (k >= -1021) return withHi(y, hiWord(y) + (k << 20));
  return withHi(y, hiWord(y) + ((k + 1000) << 20)) * TWOM1000;
}

/** x^n for a whole n by repeated multiplication (exact for the tiers' edge ratios); n < 0 gives 1 / x^|n|. */
export function powi(x, n) {
  if (!Number.isInteger(n)) throw new Error(`powi: ${n} is not a whole number`);
  let r = 1;
  for (let i = 0; i < Math.abs(n); i++) r *= x;
  return n < 0 ? 1 / r : r;
}
/** x^y for x > 0: a whole y by powi, any other y as exp(y log x) (deterministic, not correctly rounded). */
export function pow(x, y) {
  if (Number.isInteger(y)) return powi(x, y);
  if (!(x > 0)) throw new Error(`pow(${x}, ${y}): a non-integer power needs x > 0`);
  return exp(y * log(x));
}
