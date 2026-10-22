const MeV=1.602176634e-13;
const Mpc2=1.5032774747364482e-10, mec2=8.187105776885342e-14, K=4.9198838988555e-18, ZA=465.57, I=4.5822251732400005e-17, lam=1321;
function dEdX(E){ const g=1+E/Mpc2, b2=1-1/(g*g); const bg2=b2*g*g; const mr=mec2/Mpc2;
 const Tmax=2*mec2*bg2/(1+2*g*mr+mr*mr);
 return K*ZA/b2*(0.5*Math.log(2*mec2*bg2*Tmax/(I*I))-b2);}
const gl=[[-0.9931285991850949,0.017614007139152],[-0.9639719272779138,0.040601429800387],[-0.9122344282513259,0.062672048334109],[-0.8391169718222188,0.083276741576705],[-0.7463319064601508,0.10193011981724],[-0.6360536807265150,0.118194531961518],[-0.5108670019508271,0.131688638449177],[-0.3737060887154195,0.142096109318382],[-0.2277858511416451,0.149172986472604],[-0.0765265211334973,0.152753387130726]];
const pts=[];for(const [x,w] of gl){pts.push([x,w],[-x,w]);}
const Emin=1*MeV;
function quadlog(f,a,b,n=60){let s=0;const la=Math.log(a),lb=Math.log(b);for(let i=0;i<n;i++){const lo=la+(lb-la)*i/n,hi=la+(lb-la)*(i+1)/n,h=(hi-lo)/2,c=(hi+lo)/2;for(const [x,w] of pts){const e=Math.exp(c+h*x);s+=w*h*e*f(e);}}return s;}
const csda=(E)=>quadlog(e=>1/dEdX(e),Emin,E);
function beam(E0,sigmas){
 const R0=csda(E0);
 const Eof=X=>{ if(X>=R0) return Emin; let lo=Emin,hi=E0,t=R0-X; for(let i=0;i<100;i++){const m=0.5*(lo+hi); if(csda(m)<t)lo=m;else hi=m;} return 0.5*(lo+hi);};
 const out=[];let Xa=0,Ea=E0;
 for(const sg of sigmas){const Xb=Xa+sg;const Eb=Xb>=R0?Emin:Eof(Xb);
   const Sx=E=>Math.exp(-(R0-csda(E))/lam);
   let d=quadlog(e=>Sx(e),Eb,Ea,20); // electronic: int S dE
   d+=quadlog(e=>Sx(e)*e/(lam*dEdX(e)),Eb,Ea,20);
   if(Xb>=R0) d+=Math.exp(-R0/lam)*Emin;
   out.push(d/E0);Xa=Xb;Ea=Eb;}
 const leave=(Xa<R0)?Math.exp(-Xa/lam)*Ea/E0:0;
 return {out,leave,R0};}
globalThis.beam=beam;globalThis.csda=csda;globalThis.MeV=MeV;
if(process.argv[2]!=='lib'){
const E=100*MeV;
for(const [nm,s] of [['hold chord1',[120,120]],['hold chord .5',[60,60]],['plate .2 c1',[1570,120,120]],['plate .2 c.707',[1570/Math.SQRT2,120,120]],['plate .01 c1',[78.5,120,120]],['plate .1',[785,120,120]],['single hold',[120]]]){
 const r=beam(E,s);console.log(nm.padEnd(16),r.out.map(x=>x.toFixed(6)).join(' '),'leave',r.leave.toExponential(3),'sum',(r.out.reduce((a,b)=>a+b,0)+r.leave).toFixed(10));}
console.log('R100',beam(E,[1]).R0);
for(const e of [10,20,50,100,200,400]){const d=1e-4;const sl=(Math.log(csda(e*MeV*(1+d)))-Math.log(csda(e*MeV*(1-d))))/(2*d);console.log('csda',e,'R=',csda(e*MeV).toFixed(4),'dlnR/dlnE',sl.toFixed(4),'x1e-14',(sl*1e-14).toExponential(2));}}
