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
