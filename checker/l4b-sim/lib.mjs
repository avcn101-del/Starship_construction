export const c = 1545.364227446998, rho = 7850, m = 6, H = 3;
const D = Math.cbrt(4*m/(Math.PI*rho*4)); export const A0 = Math.PI*D*D/4; const L = 4*D; export const S = c*rho*L;
export function round(state, path, v=800) {
  let p = m*v, f = 0, stopped = null; const losses = []; let passed=0;
  for (const e of path) {
    if (state[e.id] <= 0) continue;
    const r = c*e.sigma*(e.chord??1), A = A0/(1-f), s = p/A;
    if (s > r && f + r/S < 1) { losses.push([e.id, 1/H]); p -= r*A; f += r/S; passed++; }
    else { const taken = Math.min(s, r); losses.push([e.id, taken/r/H]); f = Math.min(1, f + taken/S); stopped = {id:e.id, pStop:p, s, r}; break; }
  }
  for (const [id,l] of losses) { const left = state[id]-l; state[id] = left > 1e-12 ? left : 0; }
  return { losses, stopped, pExit: stopped ? 0 : p, f, passed, p0:m*v };
}
