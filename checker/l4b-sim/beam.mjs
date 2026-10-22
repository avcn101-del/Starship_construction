const Mp=1.5032774747364482e-10, me=8.187105776885342e-14, K=4.9198838988555e-18*465.57, I=4.5822251732400005e-17, lam=1321;
const E0=1.6021766340000001e-11;
function dEdX(E){const g=1+E/Mp, b2=1-1/(g*g); const Tmax=2*me*b2*g*g/(1+2*g*me/Mp+(me/Mp)**2); return K/b2*(0.5*Math.log(2*me*b2*g*g*Tmax/(I*I))-b2);}
// returns fractions deposited in consecutive layers (areal densities sig[]) for E0
export function fractions(sig,E=E0,dxMax=0.02){let n=1,e=E;const F=[];for(const s of sig){let dep=0,x=0;while(x<s&&e>0){const dx=Math.min(dxMax,s-x);let de=dEdX(e)*dx;if(de>=e*0.5&&e>0){ // near stop: adaptive
 const sub=dx/50;for(let i=0;i<50&&e>0;i++){const d2=Math.min(dEdX(e)*sub,e);dep+=n*d2;e-=d2;const nu=n*sub/lam;dep+=nu*e;n-=nu;if(e<1e-3*E)break;}
 if(e<1e-3*E){dep+=n*e;e=0;n=0;}x+=dx;continue;}
 dep+=n*de;e-=de;const nu=n*dx/lam;dep+=nu*e;n-=nu;x+=dx;}
 F.push(dep/E);}
 return F;}
if (process.argv[1].endsWith('beam.mjs')){
 for (const s of [[120,120],[120,120,1570],[1570],[592,592],[120]]) {const F=fractions(s);console.log(s.join(','),F.map(x=>x.toFixed(5)).join(' '),'sum',F.reduce((a,b)=>a+b).toFixed(5));}
}
