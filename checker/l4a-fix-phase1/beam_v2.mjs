import './beam_bethe.mjs';
const E=100*globalThis.MeV;
const Pdt=5e6/60,q=3000;
const R=globalThis.beam(E,[1]).R0;console.log('R(100 MeV)',R);
for(const [nm,sig,mp] of [['d0.2 c1',1570,39250],['d0.2 c1/sqrt2',1570*Math.SQRT1_2,39250],['d0.01 c1',78.5,1962.5],['d0.01 cos1/sqrt2',78.5*Math.SQRT2,1962.5],['d0.01 chord 1/sqrt2 (ref)',78.5*Math.SQRT1_2,1962.5]]){
 const r=globalThis.beam(E,[sig,120,120]);const F=r.out;console.log(nm.padEnd(26),'sigma',sig.toFixed(3),'F plate,c00,c10',F.map(x=>x.toFixed(6)).join(' '),'leave',r.leave.toExponential(2));
 console.log('   plate burn/step',(F[0]*Pdt/(q*mp)).toExponential(5),' c00 burn/step',(F[1]*Pdt/(q*3000)).toExponential(5),' c10',(F[2]*Pdt/(q*3000)).toExponential(4),' heat/step',(F.reduce((a,b)=>a+b,0)*Pdt).toFixed(2));}
