// L0.armour.plate.v2, blind derivation. node plate_v2.mjs
const rho=7850,c=1545.364227446998,m=6,v=800,hits=3,edge=5,cellM=3000,Pdt=5e6/60,q=3000,cp=450;
const d0=Math.cbrt(m/(rho*Math.PI)),L=4*d0,A0=Math.PI*d0*d0/4,S=c*rho*L,p0=m*v;
const sg=(d,chord,cos)=>{const cc=Math.max(cos,d/edge);return d*rho/cc*chord;};
function roundRun(entries){ // entries {id,sig,room,integ}
 let p=p0,f=0;const log=[];const impulse={};
 for(const e of entries){ if(e.integ<=0){log.push(e.id+' hole');continue;}
  const r=c*e.sig,A=A0/(1-f),s=p/A;
  if(s>r&&f+r/S<1){const t=r*A;log.push(`${e.id} pass r=${r.toPrecision(7)} took ${t.toPrecision(7)} f->${(f+r/S).toFixed(5)}`);p-=t;f+=r/S;e.integ-=1/hits;impulse[e.room]=(impulse[e.room]||0)+t;}
  else{const t=Math.min(s,r);log.push(`${e.id} STOP r=${r.toPrecision(7)} s=${s.toPrecision(7)} sect.took ${t.toPrecision(7)} loss ${(t/r/hits).toFixed(6)}`);e.integ-=t/r/hits;f=Math.min(1,f+t/S);impulse[e.room]=(impulse[e.room]||0)+p;p=0;break;}}
 return {p,log,impulse};}
const KE=0.5*m*v*v;
function mk(d,chord,cos,room='H'){return [{id:'plate',sig:sg(d,chord,cos),room,integ:1,d},{id:'c00',sig:120,room:'H',integ:1},{id:'c10',sig:120,room:'H',integ:1}];}
const rs=(name,d,chord,cos,N)=>{const E=mk(d,chord,cos);console.log('\n==',name,'sigma_plate',E[0].sig.toFixed(3),'r',(c*E[0].sig).toPrecision(7),'s0',(p0/A0).toPrecision(7),'plate mass',d*rho*edge*edge);
 for(let i=1;i<=N;i++){const r=roundRun(E);const heat=KE-r.p*r.p/(2*m);console.log(' round',i,r.log.join(' | '));console.log('   exit p',r.p.toPrecision(7),'heat',heat.toFixed(1),'integ',E.map(e=>e.id+':'+e.integ.toPrecision(6)).join(' '));}};
rs('round d0.2 chord1',0.2,1,1,1);rs('round d0.2 chord1/sqrt2',0.2,Math.SQRT1_2,1,1);rs('round d0.1 chord1 x1',0.1,1,1,1);rs('round d0.1 chord1 x4',0.1,1,1,4);
rs('round d0.1 cos1/sqrt2',0.1,1,Math.SQRT1_2,1);rs('round d0.2 cos0.02 (cap 0.04)',0.2,1,0.02,1);
console.log('\nfloat: 1-1/3-1/3-1/3 =',1-1/3-1/3-1/3,'; 1-3*(1/3) =',1-3*(1/3));
// heat capacities
const Ch=4*1.35e6; for(const d of [0.2,0.15,0.1,0.01]){const mp=d*rho*25;const Cp=mp*cp;const burn=(Pdt)/(q*mp);console.log('d',d,'plate mass',mp,'Cp',Cp,'Chold',Ch+Cp,'burn/step (F=1)',burn,'1/burn',1/burn,'steps',Math.ceil(1/burn),'t',Math.ceil(1/burn)/60);}
// ruin
for(const d of [0.2,0.15]){const mp=d*rho*25,Cp=mp*cp,n=Math.ceil(1/(Pdt/(q*mp)));const Q=n*Pdt,Ct=Ch+Cp;const dT=Q/Ct;console.log('ruin d',d,'step',n,'t',n/60,'Q deposited',Q,'dT',dT,'plate share',Cp/Ct,'vented above-rest',Q*Cp/Ct,'left above-rest',Q*Ch/Ct,'C after',Ch,'abs vented rest part Cp*(290+dT)',Cp*(290+dT));
 let s=0,i=0;while(s<1){s+=Pdt/(q*mp);i++;}console.log('  float accumulation reaches 1 at step',i,'sum',s);}
// mount cases: round along row0 from +x: B cells (3,0),(2,0), plate, A cells (1,0),(0,0)
for(const mount of ['A','B']){const E=[{id:'B30',sig:120,room:'B',integ:1},{id:'B20',sig:120,room:'B',integ:1},{id:'plate',sig:0.2*rho,room:mount,integ:1},{id:'A10',sig:120,room:'A',integ:1},{id:'A00',sig:120,room:'A',integ:1}];
 const r=roundRun(E);const heat=KE-r.p*r.p/(2*m);const tot=Object.values(r.impulse).reduce((a,b)=>a+b,0);console.log('\nmount on',mount,r.log.join(' | '));console.log(' impulse by room',JSON.stringify(r.impulse),'exit p',r.p,'heat total',heat);
 for(const k in r.impulse)console.log('  room',k,'heat share (by impulse)',(heat*r.impulse[k]/tot).toFixed(1));
 const mp=0.2*rho*25,Cp=mp*cp;console.log(' C_A',4*1.35e6+(mount==='A'?Cp:0),'C_B',4*1.35e6+(mount==='B'?Cp:0));}
