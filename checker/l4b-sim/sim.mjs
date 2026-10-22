// Phase 2: my own sim with the quarters repair field (13d.1 'Repair sharing', 13e.1, 13k.1) added; rounds as in phase 1.
import {c,A0,S,m} from './lib.mjs';
const dt=1/60, H=3, MASS={crew:14800,hold:3000,mag:3000,sg:10000,reactor:150000,sink:3000+4*1.35e6/4186};
const SIG=(k)=>MASS[k]/25;
export function make(cells, quarters){ // cells: {id, room, kind, pos:[x,y] room centre, mass}
  const st={}; for(const x of cells) st[x.id]={...x,integ:1}; return {st, quarters, step:0};
}
function grants(W){
  const out=[]; if(!W.quarters) return out;
  const q=W.quarters; const alive=q.cells.filter(id=>W.st[id].integ>0).length; const base=200*alive/q.cells.length; if(!(base>0)) return out;
  for(const x of Object.values(W.st)){ if(x.room===q.room||x.integ<=0||x.integ>=1) continue; const r=Math.hypot(x.pos[0]-q.pos[0],x.pos[1]-q.pos[1]); out.push({x,mass:base/(1+(r/30)**2)}); }
  const sum=out.reduce((a,g)=>a+g.mass,0); if(sum>base) for(const g of out) g.mass*=base/sum;
  return out;
}
export function stepRepair(W){ for(const g of grants(W)){ const x=g.x; x.integ=Math.min(1,x.integ+g.mass/x.mass*dt);} W.step++; }
// fire one round along path (ids / plate objects), speed v
export function hit(W, path, v=800){
  let p=m*v,f=0,stop=null; const loss=[]; let passed=0;
  for(const e of path){ const cell=e.plate?e.plate:W.st[e.id]; if(cell.integ<=0) continue; const sigma=e.plate?e.sigma:SIG(cell.kind), r=c*sigma*(e.chord??1), A=A0/(1-f), s=p/A;
    if(s>r&&f+r/S<1){loss.push([cell,1/H]);p-=r*A;f+=r/S;passed++;} else {const t=Math.min(s,r);loss.push([cell,t/r/H]);f=Math.min(1,f+t/S);stop=e.id||e.plate.id;break;} }
  for(const [cell,l] of loss){const left=cell.integ-l;cell.integ=left>1e-12?left:0;}
  return {passed,stop};
}
