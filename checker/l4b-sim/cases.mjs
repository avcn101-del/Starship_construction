import {make,stepRepair,hit} from './sim.mjs';
const dt=1/60;
function arrivalSteps(tof,n,anchor=0){const a=[];for(let i=0;i<n;i++)a.push(Math.ceil((anchor+2*i+tof)/dt-1e-9));return a;}
// ---- R1 geometry: rooms (centre positions in grid m), cell lists
const R={quarters:[32.5,25],hold:[40,5],mag:[40,15],bridge:[30,15],sg:[20,5],reactor:[20,15],sink:[20,25],turret:[45,25],beam:[50,15]};
// ---- R1 magazine, column 7: hold0,hold2,mag0,mag2,q(7,4)=idx2, q(7,5)=idx5
function R1mag(){
 const cells=[];const add=(id,room,kind,mass)=>cells.push({id,room,kind,pos:R[room==='hold'?'hold':room==='mag'?'mag':room],mass});
 add('h0','hold','hold',3000);add('h2','hold','hold',3000);add('m0','mag','mag',3000);add('m2','mag','mag',3000);
 const qx=['q2','q5'];qx.forEach(i=>cells.push({id:i,room:'quarters',kind:'crew',pos:R.quarters,mass:14800}));
 const W=make(cells,{room:'quarters',pos:R.quarters,cells:['q2','q5']});
 const arr=arrivalSteps(1.08688,10);let k=0;
 for(let n=1;n<=1500;n++){stepRepair(W);if(n===arr[k]){hit(W,['h0','h2','m0','m2','q2','q5'].map(id=>({id})));k++;console.log('R1 mag shot',k,'step',n,['h0','h2','m0','m2'].map(i=>W.st[i].integ.toFixed(4)).join(' '));if(W.st.m0.integ<=0)break;}}
}
R1mag();
// ---- R1 reactor
function R1reactor(){
 const R_={sg:[20,5],reactor:[20,15],sink:[20,25],quarters:[32.5,25]};
 const cells=[];const add=(id,room,kind,mass)=>cells.push({id,room,kind,pos:R_[room],mass});
 for(const i of [0,1,2,3]){add('g'+i,'sg','sg',10000);add('r'+i,'reactor','reactor',150000);add('s'+i,'sink','sink',4290.01);}
 const W=make(cells,{room:'quarters',pos:R_.quarters,cells:['qq']}); W.st.qq={id:'qq',room:'quarters',integ:1,mass:1,pos:R_.quarters,kind:'crew'};
 W.quarters.cells=['qq'];
 const col={3:['g0','g2','r0','r2','s0','s2'],4:['g1','g3','r1','r3','s1','s3']};
 const arr=arrivalSteps(1.08688,80);let k=0,first=null;
 for(let n=1;n<=9000&&k<80;n++){stepRepair(W);if(n===arr[k]){const idx=['r0','r1','r2','r3'].find(i=>W.st[i].integ>0);const cx=['r0','r2'].includes(idx)?3:4;hit(W,col[cx].map(id=>({id})));k++;
   const dead=['r0','r1','r2','r3'].filter(i=>W.st[i].integ<=0).length;
   if(dead>=2){console.log('reactor breach at shot',k,'step',n,'t',(n*dt).toFixed(3),'explosion step ~',n+600);break;}}}
}
R1reactor();
// ---- R1d magazine rounds
function R1d(){
 const cells=[];const add=(id,room,kind,mass,pos)=>cells.push({id,room,kind,pos,mass});
 add('h0','hold','hold',3000,[40,5]);add('h2','hold','hold',3000,[40,5]);add('m0','mag','mag',3000,[40,15]);add('m2','mag','mag',3000,[40,15]);
 add('q2','quarters','crew',14800,[32.5,25]);add('q5','quarters','crew',14800,[32.5,25]);
 const W=make(cells,{room:'quarters',pos:[32.5,25],cells:['q2','q5']});
 const cosT=1/Math.sqrt(1+0.0126**2);const P1={id:'P1',integ:1,sigma:1570/cosT},P2={id:'P2',integ:1,sigma:1570/cosT};
 const path=[{id:'h0'},{id:'h2'},{plate:P1,sigma:P1.sigma},{id:'m0'},{id:'m2'},{plate:P2,sigma:P2.sigma},{id:'q2'},{id:'q5'}];
 const arr=arrivalSteps(1.08555,20);let k=0;
 for(let n=1;n<=2400&&k<20;n++){stepRepair(W);if(n===arr[k]){hit(W,path);k++;console.log('R1d shot',k,'step',n,'P1',P1.integ.toFixed(4),'P2',P2.integ.toFixed(4),['h0','m0'].map(i=>W.st[i].integ.toFixed(4)).join(' '));if(W.st.m0.integ<=0){console.log('first magazine cell destroyed by shot',k,'step',n);break;}}}
}
R1d();
// ---- T-neck split: hold [5,7)x[2,4), column 5 = cells idx0 (5,2) and idx2 (5,3); quarters [7,10)x[4,6) at (42.5, 25)
function neck(){
 const cells=[];for(const i of ['h0','h2']) cells.push({id:i,room:'hold',kind:'hold',pos:[30,15],mass:3000});
 cells.push({id:'qq',room:'quarters',kind:'crew',pos:[42.5,25],mass:14800});
 const W=make(cells,{room:'quarters',pos:[42.5,25],cells:['qq']});const arr=arrivalSteps(1.0992,8);let k=0;
 for(let n=1;n<=1000&&k<8;n++){stepRepair(W);if(n===arr[k]){hit(W,[{id:'h0'},{id:'h2'}]);k++;console.log('neck shot',k,'step',n,W.st.h0.integ.toFixed(4),W.st.h2.integ.toFixed(4));if(W.st.h0.integ<=0&&W.st.h2.integ<=0){console.log('column 5 cut: split at step',n,'Disabled at',n+600);break;}}}
}
neck();
