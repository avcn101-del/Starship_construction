// proto/detmath.js — STAND-IN: the same Math.sin and Math.cos on every
// JavaScript engine, so a battle played on the phone replays bit for bit in
// Node (proto/replay.mjs, MATCH on the event hash). Engines differ: Node 22's
// V8 and Chromium 141's give a different last bit for about 3 % of arguments,
// and the kernel turns ships with them (js/body.js rotate), so without this a
// battle in which ships turn cannot replay across engines. This is a port of
// fdlibm's sin and cos (FreeBSD k_sin.c, k_cos.c, e_rem_pio2.c, accurate to
// under one unit in the last place) written with + - * / and Math.floor only,
// which IEEE 754 makes exact everywhere. Installed once, before any battle
// runs; it changes no number of js/data.js and no file of js/. The kernel
// should get its own deterministic trigonometry in js/util.js (a question for
// the designer in the pull request). No DOM.

const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04;
const S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05;
const C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;
const INV_PIO2 = 6.36619772367581382433e-01;
const PIO2_1 = 1.57079632673412561417e+00, PIO2_1T = 6.07710050650619224932e-11;
const PIO2_2 = 6.07710050630396597660e-11, PIO2_2T = 2.02226624879595063154e-21;
const PIO2_3 = 2.02226624871116645580e-21, PIO2_3T = 8.47842766036889956997e-32;
const PIO4 = 7.85398163397448278999e-01;
const LIMIT = 4e5; // beyond this many radians the three-part reduction loses digits: fall back (never reached by a heading)

function kernelSin(x, y) {
  const z = x * x, v = z * x, r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  return x - ((z * (0.5 * y - v * r) - y) - v * S1);
}
function kernelCos(x, y) {
  const z = x * x, w = z * z, r = z * (C1 + z * (C2 + z * C3)) + w * w * (C4 + z * (C5 + z * C6)), hz = 0.5 * z, u = 1 - hz;
  return u + (((1 - u) - hz) + (z * r - x * y));
}
/** x = n pi/2 + (y0 + y1), |y0 + y1| <= pi/4 (Cody-Waite, three parts of pi/2, every refinement applied). */
function reduce(x) {
  const n = Math.floor(x * INV_PIO2 + 0.5);
  let r = x - n * PIO2_1, w = n * PIO2_1T, y0 = r - w;
  let t = r; w = n * PIO2_2; r = t - w; w = n * PIO2_2T - ((t - r) - w); y0 = r - w;
  t = r; w = n * PIO2_3; r = t - w; w = n * PIO2_3T - ((t - r) - w); y0 = r - w;
  return [n, y0, (r - y0) - w];
}

const nativeSin = Math.sin, nativeCos = Math.cos;
export function sin(x) {
  const a = x < 0 ? -x : x;
  if (!(a <= LIMIT)) return nativeSin(x); // NaN, infinities, huge arguments
  if (a < 7.450580596923828e-9) return x;
  if (a <= PIO4) return kernelSin(x, 0);
  const [n, y0, y1] = reduce(x), q = ((n % 4) + 4) % 4;
  return q === 0 ? kernelSin(y0, y1) : q === 1 ? kernelCos(y0, y1) : q === 2 ? -kernelSin(y0, y1) : -kernelCos(y0, y1);
}
export function cos(x) {
  const a = x < 0 ? -x : x;
  if (!(a <= LIMIT)) return nativeCos(x);
  if (a < 7.450580596923828e-9) return 1;
  if (a <= PIO4) return kernelCos(x, 0);
  const [n, y0, y1] = reduce(x), q = ((n % 4) + 4) % 4;
  return q === 0 ? kernelCos(y0, y1) : q === 1 ? -kernelSin(y0, y1) : q === 2 ? -kernelCos(y0, y1) : kernelSin(y0, y1);
}

Math.sin = sin;
Math.cos = cos;
