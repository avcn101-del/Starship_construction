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
// exponent bits read through a DataView, all exact in IEEE 754. The sin and
// cos ports keep only the y-form of k_sin.c (no iy == 0 branch) and always
// apply the three refinements of the pi/2 reduction: within 1 ulp of
// Math.sin and Math.cos, and deterministic.

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

// The two words of a double put together (the inverse of hiWord and loWord).
const fromWords = (hi, lo) => { WORDS.setInt32(0, hi); WORDS.setUint32(4, lo); return WORDS.getFloat64(0); };

// atan2, cbrt (#310): ECMAScript leaves Math.atan2, Math.cbrt and Math.hypot
// implementation-approximated, and Node's V8 and Chromium differ in the last
// bits of atan2 and cbrt. cbrt is a port of fdlibm (FreeBSD msun s_cbrt.c).
// atan2 follows fdlibm (s_atan.c, e_atan2.c: the same breakpoints, tables and
// polynomial) but carries y / x and the reduced argument as double-doubles
// (Dekker's exact product by Veltkamp splitting) and rounds once at the end:
// fdlibm's own atan2 rounds y / x first and errs by up to 1.23 ulp. Measured
// by tools/mathcheck.mjs.

/** a + b as [sum, error], exactly (Knuth's two-sum). */
function twoSum(a, b) {
  const s = a + b, bb = s - a;
  return [s, (a - (s - bb)) + (b - bb)];
}
/** a b as [product, error], exactly for |a|, |b| below 1e290 (Veltkamp split, Dekker product). */
function twoProd(a, b) {
  const p = a * b, ca = 134217729 * a, cb = 134217729 * b; // 2^27 + 1
  const ah = ca - (ca - a), al = a - ah, bh = cb - (cb - b), bl = b - bh;
  return [p, ((ah * bh - p) + ah * bl + al * bh) + al * bl];
}
/** The double-double (h, l) divided by the double-double (dh, dl), as a double-double to about 2^-104. */
function ddDiv(h, l, dh, dl) {
  const q1 = h / dh, [ph, pl] = twoProd(q1, dh);
  const q2 = ((((h - ph) - pl) + l) - q1 * dl) / dh;
  const s = q1 + q2;
  return [s, q2 - (s - q1)];
}

const ATANHI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
const ATANLO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const AT0 = 3.33333333333329318027e-01, AT1 = -1.99999999998764832476e-01, AT2 = 1.42857142725034663711e-01;
const AT3 = -1.11111104054623557880e-01, AT4 = 9.09088713343650656196e-02, AT5 = -7.69187620504482999495e-02;
const AT6 = 6.66107313738753120669e-02, AT7 = -5.83357013379057348645e-02, AT8 = 4.97687799461593236017e-02;
const AT9 = -3.65315727442169155270e-02, AT10 = 1.62858201153657823623e-02;
/** atan(t) for the double-double t = th + tl, 0 <= t <= 2^60, as a double-double (fdlibm s_atan.c's reduction). */
function atanDD(th, tl) {
  let id = -1, uh = th, ul = tl;
  if (th >= 0.4375) {
    if (th < 0.6875) { const [nh, nl] = twoSum(2 * th - 1, 2 * tl), [dh, dl] = twoSum(2, th); [uh, ul] = ddDiv(nh, nl, dh, dl + tl); id = 0; } // (2t - 1) / (2 + t)
    else if (th < 1.1875) { const [nh, nl] = twoSum(th, -1), [dh, dl] = twoSum(th, 1); [uh, ul] = ddDiv(nh, nl + tl, dh, dl + tl); id = 1; } // (t - 1) / (t + 1)
    else if (th < 2.4375) { const [nh, nl] = twoSum(th, -1.5), [ph, pl] = twoProd(1.5, th), [dh, dl] = twoSum(1, ph); [uh, ul] = ddDiv(nh, nl + tl, dh, dl + pl + 1.5 * tl); id = 2; } // (t - 1.5) / (1 + 1.5 t)
    else { [uh, ul] = ddDiv(-1, 0, th, tl); id = 3; } // -1 / t
  }
  const z = uh * uh, w = z * z;
  const s1 = z * (AT0 + w * (AT2 + w * (AT4 + w * (AT6 + w * (AT8 + w * AT10)))));
  const s2 = w * (AT1 + w * (AT3 + w * (AT5 + w * (AT7 + w * AT9))));
  if (id < 0) { const s = uh + (ul - uh * (s1 + s2)); return [s, (ul - uh * (s1 + s2)) - (s - uh)]; }
  const [h, e] = twoSum(ATANHI[id], uh), lo = e + ATANLO[id] + ul - uh * (s1 + s2), s = h + lo;
  return [s, lo - (s - h)];
}

const PI = 3.1415926535897931160e+00, PI_LO = 1.2246467991473531772e-16, PI_O_2 = 1.5707963267948965580e+00;
const ATAN2_MIN = 1e-100, ATAN2_MAX = 1e100; // the products and splits of the double-doubles stay exact and normal
/**
 * Deterministic atan2(y, x), the angle of (x, y) in [-pi, pi]. Each of x and y
 * must be 0 or of magnitude in [1e-100, 1e100] (the kernel's separations and
 * velocities, metres and m/s); anything else, NaN and infinities throw.
 */
export function atan2(y, x) {
  const ax = x < 0 ? -x : x, ay = y < 0 ? -y : y;
  if (!((ax === 0 || (ax >= ATAN2_MIN && ax <= ATAN2_MAX)) && (ay === 0 || (ay >= ATAN2_MIN && ay <= ATAN2_MAX)))) throw new Error(`atan2(${y}, ${x}): outside the deterministic range`);
  const neg = y < 0 || Object.is(y, -0), left = x < 0 || Object.is(x, -0); // fdlibm's m: 2 sign(x) + sign(y)
  if (ay === 0) return left ? (neg ? -PI : PI) : y;
  if (ax === 0) return neg ? -PI_O_2 : PI_O_2;
  // t = |y| / |x| as a double-double: q1 + (|y| - q1 |x|) / |x|, the remainder exact
  const q1 = ay / ax;
  let zh, zl;
  if (q1 > 1.152921504606847e18) { zh = PI_O_2; zl = 6.123233995736766e-17; } // |y / x| > 2^60: atan is pi/2 to the last bit
  else { const [ph, pl] = twoProd(q1, ax); [zh, zl] = atanDD(q1, ((ay - ph) - pl) / ax); }
  let r;
  if (left) { const [h, e] = twoSum(PI, -zh); r = h + (e + (PI_LO - zl)); } // pi - atan(t)
  else r = zh + zl;
  return neg ? -r : r;
}

const CB_B1 = 715094163, CB_B2 = 696219795; // (1023 - 1023/3 - 0.03306235651) 2^20, and less 54/3 for subnormals
const CB_P0 = 1.87595182427177009643, CB_P1 = -1.88497979543377169875, CB_P2 = 1.621429720105354466140;
const CB_P3 = -0.758397934778766047437, CB_P4 = 0.145996192886612446982;
/** Deterministic cube root (fdlibm s_cbrt.c, Bruce Evans's version, error < 0.667 ulp). */
export function cbrt(x) {
  let hx = hiWord(x);
  const sign = hx & 0x80000000;
  hx &= 0x7fffffff;
  if (hx >= 0x7ff00000) return x + x; // NaN, infinities
  let t;
  if (hx < 0x00100000) { // zero or subnormal
    if ((hx | loWord(x)) === 0) return x;
    t = x * 18014398509481984; // 2^54
    t = fromWords(sign | (Math.floor((hiWord(t) & 0x7fffffff) / 3) + CB_B2), 0);
  } else {
    t = fromWords(sign | (Math.floor(hx / 3) + CB_B1), 0);
  }
  // to 23 bits: cbrt(x) = t cbrt(x / t^3) ~= t P(t^3 / x)
  let r = (t * t) * (t / x);
  t = t * ((CB_P0 + r * (CB_P1 + r * CB_P2)) + ((r * r) * r) * (CB_P3 + r * CB_P4));
  // round t away from zero to 23 bits: add 2^31 to the 64-bit word, then clear the low 30 bits
  let hi = hiWord(t), lo = loWord(t) + 0x80000000;
  if (lo >= 4294967296) { lo -= 4294967296; hi += 1; }
  t = fromWords(hi, (lo & 0xc0000000) >>> 0);
  // one Newton step to 53 bits
  const s = t * t; // exact
  r = x / s;
  const w = t + t; // exact
  r = (r - t) / (w + r); // r - t exact
  return t + t * r;
}

const HYPOT_LIMIT = 1e150; // a, b at most this: a*a + b*b cannot overflow (the kernel's distances are under 1e6 m)
/**
 * Deterministic hypot for the kernel's distances: Math.sqrt(a*a + b*b), every
 * operation correctly rounded by IEEE 754. |a| or |b| above 1e150, NaN and
 * infinities are not used by the kernel and throw.
 */
export function hypot(a, b) {
  if (!((a < 0 ? -a : a) <= HYPOT_LIMIT && (b < 0 ? -b : b) <= HYPOT_LIMIT)) throw new Error(`hypot(${a}, ${b}): outside the deterministic range`);
  return Math.sqrt(a * a + b * b);
}
