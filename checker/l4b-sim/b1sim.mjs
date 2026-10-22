import {make,stepRepair,hit} from './sim.mjs';
const cells=[]; const pos={bridge:[30,15],quarters:[32.5,25]};
const bx=[[5,2],[6,2],[5,3],[6,3]]; bx.forEach((xy,i)=>cells.push({id:'b'+i,room:'bridge',kind:'crew',pos:pos.bridge,mass:14800,xy}));
const qx=[[5,4],[6,4],[7,4],[5,5],[6,5],[7,5]]; qx.forEach((xy,i)=>cells.push({id:'q'+i,room:'quarters',kind:'crew',pos:pos.quarters,mass:14800,xy}));
const W=make(cells,{room:'quarters',pos:pos.quarters,cells:qx.map((_,i)=>'q'+i)});
const col={5:['b0','b2','q0','q3'],6:['b1','b3','q1','q4']};
const tof=1.09938; let k=0, shotTimes=[]; 
// arrival step convention: completed steps n with n*dt >= arrival
const arrivals=[]; for(let i=0;i<20;i++) arrivals.push(Math.ceil((2*i+tof)/(1/60)-1e-9));
let nextShot=0, log=[];
for(let n=1;n<=2000&&nextShot<arrivals.length;n++){
  stepRepair(W);
  if(n===arrivals[nextShot]){
    // aim policy: first surviving bridge cell by index, column from its x
    const idx=['b0','b1','b2','b3'].find(id=>W.st[id].integ>0); const cx=W.st[idx].xy[0];
    const r=hit(W,col[cx].map(id=>({id})));
    log.push(`shot-${nextShot+1} step ${n} col ${cx}: `+['b0','b1','b2','b3'].map(id=>W.st[id].integ.toFixed(4)).join(' ')+' stop '+r.stop);
    nextShot++;
    if(['b0','b1','b2','b3'].every(id=>W.st[id].integ<=0)){break;}
  }
}
console.log(log.join('\n'));
