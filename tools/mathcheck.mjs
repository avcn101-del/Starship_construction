#!/usr/bin/env node
// tools/mathcheck.mjs — js/util.js's deterministic atan2, cbrt, exp, log and
// hypot against an exact BigInt reference (#310). For each function, 10^5
// seeded inputs over the range the kernel uses (stated below) plus the edge
// cases; prints the largest error in units in the last place of the result
// (ulp) and how many outputs differ from Node's own Math function (V8's
// fdlibm ports: information only). atan2, cbrt, exp and log must stay within
// 1 ulp; hypot is Math.sqrt(a*a + b*b), its bound printed, not asserted.
// With --chromium it also serves the repository (python3 -m http.server),
// evaluates the same inputs in Chromium through Playwright (NODE_PATH=/opt/
// node-tools/node_modules) and requires bit-identical outputs; it prints
// how many of Chromium's own Math outputs differ from Node's (the finding).
// Exit code 1 on any failure.
//
//   node tools/mathcheck.mjs [--chromium] [--n 100000]
import { rng, atan2, cbrt, exp, log, hypot } from '../js/util.js';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const argN = process.argv.indexOf('--n');
const N = argN > 0 ? Number(process.argv[argN + 1]) : 100000;

// ---------- exact arithmetic ----------
const P = 320n; // fixed-point bits of the reference
const ONE = 1n << P;
const DV = new DataView(new ArrayBuffer(8));
/** A finite double as m 2^e, m a signed BigInt. */
function parts(x) {
  DV.setFloat64(0, x);
  const hi = DV.getUint32(0), lo = DV.getUint32(4), ex = (hi >>> 20) & 0x7ff;
  let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo), e;
  if (ex === 0) e = -1074; else { m |= 1n << 52n; e = ex - 1075; }
  return { m: hi >>> 31 ? -m : m, e };
}
const bits = (x) => { DV.setFloat64(0, x); return DV.getBigUint64(0).toString(16).padStart(16, '0'); };
const shift = (a, s) => (s >= 0 ? a << BigInt(s) : a >> BigInt(-s));
/** x as a fixed-point BigInt (x 2^P, truncated). */
const fixed = (x) => { const { m, e } = parts(x); return shift(m, e + Number(P)); };
const abs = (a) => (a < 0n ? -a : a);
function isqrt(n) {
  if (n < 2n) return n;
  let x = 1n << BigInt((n.toString(2).length >> 1) + 1);
  for (;;) { const y = (x + n / x) >> 1n; if (y >= x) return x; x = y; }
}
function icbrt(n) {
  let x = 1n << BigInt(Math.floor(n.toString(2).length / 3) + 1);
  for (;;) { const y = (2n * x + n / (x * x)) / 3n; if (y >= x) return x; x = y; }
}
/** atanh(z) for a fixed-point |z| <= 1/3. */
function atanhFix(z) {
  const z2 = (z * z) >> P;
  let term = z, sum = 0n;
  for (let k = 1n; term !== 0n; k += 2n) { sum += term / k; term = (term * z2) >> P; }
  return sum;
}
/** atan(u) for 0 <= u <= 1 in fixed point with q bits (default P): three halvings u / (1 + sqrt(1 + u^2)), then the series. */
function atanFix(u, q = P) {
  const one = 1n << q;
  for (let i = 0; i < 3; i++) u = (u << q) / (one + isqrt((one << q) + u * u));
  const u2 = (u * u) >> q;
  let term = u, sum = 0n;
  for (let k = 1n, s = 1n; term !== 0n; k += 2n, s = -s) { sum += (s * term) / k; term = (term * u2) >> q; }
  return sum << 3n;
}
const LN2 = 2n * atanhFix(ONE / 3n);
const PI_FIX = 16n * (() => { const u = ONE / 5n; return atanFix(u); })() - 4n * atanFix(ONE / 239n);

// Each reference returns { n, s }: the value n 2^-s.
function refLog(x) {
  const { m, e } = parts(x), L = m.toString(2).length, k = BigInt(L - 1 + e);
  const f = shift(m, Number(P) - (L - 1)); // x / 2^k in [1, 2), fixed
  return { n: k * LN2 + 2n * atanhFix(((f - ONE) << P) / (f + ONE)), s: P };
}
function refExp(x) {
  const X = fixed(x), k = (X + (X >= 0n ? LN2 / 2n : -LN2 / 2n)) / LN2, r = X - k * LN2;
  let term = ONE, sum = 0n;
  for (let i = 1n; term !== 0n; i++) { sum += term; term = (term * r) / (i << P); }
  return { n: sum, s: P - k };
}
function refCbrt(x) {
  const { m, e } = parts(x);
  const s = 400 + ((((e - 400) % 3) + 3) % 3); // e - s divisible by 3
  const n = icbrt(abs(m) << BigInt(s));
  return { n: m < 0n ? -n : n, s: BigInt(-(e - s) / 3) };
}
function refAtan2(y, x) {
  const a = parts(y), b = parts(x);
  const num = abs(a.m), den = abs(b.m), de = a.e - b.e; // |y / x| = num / den 2^de
  // a small quotient gets more bits, so the reference keeps P bits relative to its value
  const q = P + BigInt(Math.max(0, den.toString(2).length - num.toString(2).length - de));
  let t;
  if (num === 0n) t = 0n;
  else if (den === 0n) t = (PI_FIX << (q - P)) / 2n;
  else if (de >= 0 ? num << BigInt(de) >= den : num >= den << BigInt(-de)) { // |y / x| >= 1: pi/2 - atan(|x / y|)
    t = (PI_FIX << (q - P)) / 2n - atanFix(shift(den << q, -de) / num, q);
  } else {
    t = atanFix(shift(num << q, de) / den, q);
  }
  if (x < 0 || Object.is(x, -0)) t = (PI_FIX << (q - P)) - t;
  return { n: y < 0 || Object.is(y, -0) ? -t : t, s: q };
}
function refHypot(a, b) {
  const p = parts(a), q = parts(b), c = Math.min(p.e, q.e);
  const A = shift(p.m, p.e - c), B = shift(q.m, q.e - c), sh = 200;
  return { n: isqrt((A * A + B * B) << BigInt(2 * sh)), s: BigInt(sh - c) };
}
/** (r - ref) in ulp of r, r a finite non-zero double. */
function ulpError(r, ref) {
  const { m, e } = parts(r), L = abs(m).toString(2).length;
  const ulpExp = e + L - 53; // exponent of r's last place (normal r)
  const c = Math.min(e, -Number(ref.s));
  const diff = shift(m, e - c) - shift(ref.n, -Number(ref.s) - c);
  return Number(diff) * 2 ** (c - ulpExp);
}

// ---------- inputs: the kernel's ranges, seeded ----------
const R = rng(310);
const logUniform = (lo, hi) => lo * (hi / lo) ** R(); // ** in a tool, not the kernel
const signed = (v) => (R() < 0.5 ? -v : v);
const FUNCS = {
  // headings and bearings: components of separations and velocities, 1e-6 to 1e6 m (or m/s), any sign; the
  // function's whole range, 0 or 1e-100 to 1e100, for half the inputs
  atan2: { f: atan2, m: Math.atan2, args: () => { const [lo, hi] = R() < 0.5 ? [1e-6, 1e6] : [1e-100, 1e100]; return [signed(logUniform(lo, hi)), signed(logUniform(lo, hi))]; }, ref: refAtan2, range: 'y, x in +-[1e-6, 1e6], half in +-[1e-100, 1e100] (log-uniform), every quadrant', edge: [[0, 1], [-0, 1], [0, -1], [-0, -1], [1, 0], [-1, 0], [1, -0], [0, 0], [-0, -0], [1, 1], [-1, -1], [0.4375, 1], [0.6875, 1], [1.1875, 1], [2.4375, 1], [1e-100, 1], [1e-100, -1], [1, 1e-100], [1e100, 1e-100], [1e-100, 1e100], [-1e-100, -1e100]], throws: [[1e-101, 1], [1, 1e101], [NaN, 1], [1, Infinity]] },
  // round diameters: 4 m / (pi rho LD) in m^3 for the rounds' masses, and cbrt(12); stated range [1e-12, 1e6]
  cbrt: { f: cbrt, m: Math.cbrt, args: () => [signed(logUniform(1e-12, 1e6))], ref: refCbrt, range: 'x in +-[1e-12, 1e6] (log-uniform)', edge: [[1], [8], [12], [-27], [1e-300], [5e-320], [1e300]] },
  // attenuation exp(-X / lambda), the field's Gaussian, decay heat; and pow's exp(y log x)
  exp: { f: exp, m: Math.exp, args: () => [R() < 0.5 ? (R() - 0.5) * 2 : (R() - 0.5) * 1400], ref: refExp, range: 'x in [-700, 700] (half in [-1, 1])', edge: [[0.5], [1], [-1], [0.6931471805599453], [1e-10], [-1e-10], [700], [-700]] },
  // the Bethe log and pow's log x: tier ratios, energies
  log: { f: log, m: Math.log, args: () => [R() < 0.5 ? 0.5 + 1.5 * R() : logUniform(1e-300, 1e300)], ref: refLog, range: 'x in [1e-300, 1e300] (log-uniform; half in [0.5, 2])', edge: [[2], [0.5], [10], [1 + 2 ** -52], [1 - 2 ** -53], [1e-300], [1e300]] },
  // distances between rooms and |direction|: components 1e-3 to 1e6 m, any sign
  hypot: { f: hypot, m: Math.hypot, args: () => [signed(logUniform(1e-3, 1e6)), signed(logUniform(1e-3, 1e6))], ref: refHypot, range: 'a, b in +-[1e-3, 1e6] (log-uniform)', edge: [[3, 4], [0, 1], [1, 0], [-5, 12], [1e6, 1e-3]], throws: [[1e151, 1], [1, NaN], [Infinity, 0]] },
};
const BOUND = { atan2: 1, cbrt: 1, exp: 1, log: 1 };
let failed = false;
for (const [name, F] of Object.entries(FUNCS)) {
  for (const a of F.throws || []) {
    let threw = false;
    try { F.f(...a); } catch { threw = true; }
    if (!threw) { failed = true; console.log(`${name}(${a.join(', ')}) does not throw outside its range: FAIL`); }
  }
}

const inputs = {};
for (const [name, F] of Object.entries(FUNCS)) inputs[name] = [...F.edge, ...Array.from({ length: N }, F.args)];

const nodeOut = {};
for (const [name, F] of Object.entries(FUNCS)) {
  let worst = 0, at = null, vsMath = 0;
  nodeOut[name] = inputs[name].map((a) => {
    const r = F.f(...a);
    if (!Object.is(r, F.m(...a))) vsMath++;
    if (r !== 0 && Number.isFinite(r)) {
      const err = Math.abs(ulpError(r, F.ref(...a)));
      if (err > worst) { worst = err; at = a; }
    }
    return bits(r);
  });
  const ok = BOUND[name] === undefined || worst <= BOUND[name];
  if (!ok) failed = true;
  console.log(`${name.padEnd(6)} ${inputs[name].length} inputs, ${F.range}: max error ${worst.toFixed(4)} ulp at (${at.join(', ')})${BOUND[name] ? `, bound ${BOUND[name]} ulp: ${ok ? 'PASS' : 'FAIL'}` : ' (stated, not asserted)'}; differs from Node's Math.${name} in ${vsMath}`);
}

if (process.argv.includes('--chromium')) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), PORT = 8739;
  const { chromium } = createRequire(import.meta.url)('playwright');
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${PORT}/js/util.js`); break; } catch { await new Promise((ok) => setTimeout(ok, 100)); } }
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/proto/`);
    const hex = Object.fromEntries(Object.entries(inputs).map(([k, list]) => [k, list.map((a) => a.map(bits))]));
    const out = await page.evaluate(async (hex) => {
      const u = await import('/js/util.js'), dv = new DataView(new ArrayBuffer(8));
      const toBits = (x) => { dv.setFloat64(0, x); return dv.getBigUint64(0).toString(16).padStart(16, '0'); };
      const fromHex = (h) => { dv.setBigUint64(0, BigInt('0x' + h)); return dv.getFloat64(0); };
      const res = {};
      for (const [k, list] of Object.entries(hex)) {
        const args = list.map((a) => a.map(fromHex));
        res[k] = { util: args.map((a) => toBits(u[k](...a))), math: args.map((a) => toBits(Math[k](...a))) };
      }
      return res;
    }, hex);
    await browser.close();
    for (const name of Object.keys(FUNCS)) {
      const nodeMath = inputs[name].map((a) => bits(FUNCS[name].m(...a)));
      const diff = out[name].util.filter((b, i) => b !== nodeOut[name][i]).length;
      const mathDiff = out[name].math.filter((b, i) => b !== nodeMath[i]).length;
      if (diff) failed = true;
      console.log(`${name.padEnd(6)} Chromium ${chromium.name()}: util.${name} ${diff ? `MISMATCH in ${diff}` : 'MATCH'} on ${inputs[name].length} inputs (Math.${name}: Chromium differs from Node in ${mathDiff})`);
    }
  } finally {
    server.kill();
  }
}
console.log(failed ? 'FAIL' : 'PASS');
process.exitCode = failed ? 1 : 0;
