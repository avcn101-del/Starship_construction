const dt=1/60;
// meltdown
for(const [t,C,P] of [['T1',4*5.5e6,7e6],['T3',4*5.5e6*8,28e6]]){const n=Math.ceil(C*40/(P*dt)-1e-9);console.log(t,'C',C,'t*',C*40/P,'steps',C*40/(P*dt),'n',n,'time',n*dt);}
console.log('blast reactor T1: B',4*100*150000,'E',2e8,'esc',2e8-4*100*150000,' T3 B',4*100*1.2e6,'E',1.6e9,'esc',1.6e9-4*100*1.2e6);
// blast integrity
const E=6e6*8/27, Bm=4*100*3000;console.log('E',E,'Bmag',Bm,'excess',E-Bm);
for(const f of [1,2/3,1/3]){const Bh=4*f*100*3000;const ab=Math.min(E-Bm,Bh);console.log('hold integ',f,'cap',Bh,'absorbed hold',ab,'escaped',E-Bm-ab,'per-cell share',ab/4,'cell integ after',f-ab/4/300000);}
// conduction
const G=4000*10,C=4*5.5e6;let Ta=590,Tb=290;for(let i=1;i<=2;i++){const q=G*(Ta-Tb)*dt;Ta-=q/C;Tb+=q/C;console.log('step',i,'flow',q,'Ta',Ta,'Tb',Tb);}
console.log('ratio',1-2*G*dt/C);
// repair
const rr=12.5; const g=1/(1+(rr/30)**2);console.log('g',g,'ask',200*g,'sum',400*g,'scale',200/(400*g),'per cell kg/s',200*g*200/(400*g),'time to 0.6 integ',0.6*14800/100);
// bridge heating sim
let Q=349*2.4e6;let T=349;let n=0;const Tn=290;const C2=2.4e6;
while(T<350&&n<10000){const gen=2e6+1e5;const pump=Math.min(2e5,Math.max(0,(T-295)*C2/dt));const cond=3*250*(T-Tn);Q+=(gen-pump-cond)*dt;T=Q/C2;n++;}
console.log('bridge reaches 350 K after steps',n,n*dt);
