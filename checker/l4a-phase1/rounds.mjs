const rho=7850,c=1545.364227446998,m=6,v=800,hits=3;
const d=Math.cbrt(m/(rho*Math.PI)); const L=4*d, A0=Math.PI*d*d/4; const S=c*rho*L;
const kineticStop=1045455.6555066435; console.log('d',d,'A0',A0,'A0 from kineticStop',(2/3)*4800/kineticStop,'S',S,'s0',4800/A0);
function round(entries,state){ // entries: [{sig, chord, id}] ; state integrity map
 let p=m*v,f=0;const log=[];
 for(const e of entries){ const sig=e.hole?0:e.sig*(e.chord??1); if(sig===0){log.push([e.id,'hole']);continue;}
   const r=c*sig, A=A0/(1-f), s=p/A;
   if(s>r && f+r/S<1){ log.push([e.id,'pass',r*A,'loss',1/hits]); p-=r*A; f+=r/S; e.dmg=(e.dmg||0)+1/hits; }
   else { const t=Math.min(s,r); log.push([e.id,'stop',t,'loss',t/r/hits]); e.dmg=(e.dmg||0)+t/r/hits; f=Math.min(1,f+t/S); const rem=p; p=0; log.push(['remaining to ship',rem]); break;}
 }
 return {p,f,log};}
function mk(dthick,chord){return [{id:'plate',sig:dthick*rho,chord,integ:1},{id:'h00',sig:120,integ:1},{id:'h10',sig:120,integ:1}];}
function runN(dth,chord,N){const E=mk(dth,chord);const out=[];for(let i=0;i<N;i++){for(const e of E) if(e.integ<=0)e.hole=true; const r=round(E,{}); for(const e of E){e.integ=1-(e.dmg||0); } out.push(r);
  console.log(`d=${dth} chord=${chord.toFixed(4)} round ${i+1}:`,r.log.map(x=>x.map(y=>typeof y==='number'?+y.toPrecision(6):y).join(' ')).join(' | '),' exit p=',r.p.toPrecision(6),'integ',E.map(e=>e.id+':'+Math.max(0,e.integ).toFixed(5)).join(' '));}}
runN(0.2,1,1);runN(0.2,1/Math.SQRT2,1);runN(0.1,1,1);console.log('--x4');runN(0.1,1,4);
console.log('r plate .2',c*1570,'s0<r',4800/A0<c*1570);
const loss=(4800/A0)/(c*1570)/3;console.log('R1c plate loss/round',loss,'rounds to hole',Math.ceil(1/loss), 1/loss);
// KE
console.log('KE0',0.5*m*v*v);
