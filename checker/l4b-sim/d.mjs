// Physics checker's own derivation for L4b (phase 1): document constants only.
const c = 1545.364227446998, rho = 7850, m = 6, v0 = 800, H = 3;
const D = Math.cbrt(4*m/(Math.PI*rho*4)), A0 = Math.PI*D*D/4, L = 4*D, S = c*rho*L;
console.log({D, A0, L, S, s0: m*v0/A0, c});
const sig = { crew:14800/25, hold:3000/25, plate:0.2*rho };
// simulate a battery of rounds along one path. path: array of {id, sigma, chord}; state: integrity map
function round(state, path, v=v0, log=false) {
  let p = m*v, f = 0, stopped = null; const losses = [];
  for (const e of path) {
    if (state[e.id] <= 0) continue;           // hole
    const r = c*e.sigma*(e.chord??1), A = A0/(1-f), s = p/A;
    if (s > r && f + r/S < 1) { losses.push([e.id, 1/H]); p -= r*A; f += r/S; }
    else { const taken = Math.min(s, r); losses.push([e.id, taken/r/H]); f = Math.min(1, f + taken/S); stopped = {id:e.id, p, s, r}; p = p; break; }
  }
  for (const [id,l] of losses) { const left = state[id]-l; state[id] = left > 1e-12 ? left : 0; }
  return { losses, stopped, pExit: stopped ? 0 : p, f };
}
// ---- B1/B3-like: column through two crew/hold cells then two crew cells
function seq(path, ids, n, tag) {
  const st = Object.fromEntries(ids.map(i=>[i,1])); const out=[];
  for (let k=1;k<=n;k++){ const r=round(st,path); out.push(`${k}: `+ids.map(i=>st[i].toFixed(4)).join(' ')+(r.stopped?` stop@${r.stopped.id}`:' exit')); }
  console.log(tag+'\n'+out.join('\n'));
}
const col = [{id:'b2',sigma:sig.crew},{id:'b3',sigma:sig.crew},{id:'q4',sigma:sig.crew},{id:'q5',sigma:sig.crew}];
seq(col, ['b2','b3','q4','q5'], 8, 'R1 bridge column (bridge,bridge,quarters,quarters), full chord');
const neck = [{id:'n2',sigma:sig.hold},{id:'n3',sigma:sig.hold}];
seq(neck, ['n2','n3'], 4, 'T-neck column (hold,hold)');
// ---- B6 R1 magazine through hold: hold, hold, mag, mag, turret/quarters, ...
const magR1 = [{id:'h0',sigma:sig.hold},{id:'h1',sigma:sig.hold},{id:'m2',sigma:sig.hold},{id:'m3',sigma:sig.hold},{id:'t4',sigma:sig.crew},{id:'t5',sigma:sig.crew}];
seq(magR1, ['h0','h1','m2','m3','t4','t5'], 5, 'R1 magazine (hold,hold,mag,mag,crew,crew)');
// ---- B6 R1d: hold,hold,PLATE,mag,mag,PLATE,turret,turret,(hull plate)
const th = 1/Math.sqrt(1+0.0193**2); // cos
const magD = (cos)=>[{id:'h0',sigma:sig.hold},{id:'h1',sigma:sig.hold},{id:'P1',sigma:sig.plate/cos},{id:'m2',sigma:sig.hold},{id:'m3',sigma:sig.hold},{id:'P2',sigma:sig.plate/cos},{id:'t4',sigma:sig.crew},{id:'t5',sigma:sig.crew},{id:'P3',sigma:sig.plate/cos}];
const ids = ['h0','h1','P1','m2','m3','P2','t4','t5','P3'];
seq(magD(1), ids, 10, 'R1d magazine path, cos=1');
seq(magD(th), ids, 10, 'R1d magazine path, cos=0.99981');
// stop ratio at plate
{ const st=Object.fromEntries(ids.map(i=>[i,1])); const r=round(st,magD(1)); console.log('first-round plate loss', 1-st.P1, r.stopped); }
