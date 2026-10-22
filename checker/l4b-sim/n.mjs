import {round,c,A0,S,m} from './lib.mjs';
// B3 impulse per round through two hold cells
{const st={a:1,b:1};const r=round(st,[{id:'a',sigma:120},{id:'b',sigma:120}]);console.log('hold-hold round: exit p',r.pExit,'impulse',4800-r.pExit,'passed',r.passed,'f',r.f);}
// B10
const cosphi=Math.cos(Math.atan((5.8645-(-7.7517))/(-1.1842+885.6846)));
const phi=Math.atan2(5.8645+7.7517, -1.1842+885.6846);
const vr=Math.hypot(800*Math.sin(phi),800*Math.cos(phi)-100);
console.log('phi',phi,'v_rel',vr);
function run(v){const st={a:1,b:1,c:1,d:1};const r=round(st,[{id:'a',sigma:592},{id:'b',sigma:592},{id:'c',sigma:592},{id:'d',sigma:592}],v);return {r,st};}
for(const v of [700,vr,800]){const {r,st}=run(v);const rr=c*592;console.log('v',v,'r',rr,'passed',r.passed,'stop',r.stopped.id,'pStop',r.stopped.pStop,'s',r.stopped.s,'f_at_stop',r.f,'losses',r.losses.map(l=>l.join(':')).join(' '));}
// total f after stop
{const v=vr;const p0=m*v;let f=0;const r=c*592;let p=p0;const A=A0/(1-f);p-=r*A;f+=r/S;const A1=A0/(1-f);const s=p/A1;console.log('f after pass',f,'s at stop',s,'f final',f+s/S);}
// cull: angular momentum
{const L=[-7.751659078663657,-885.6845703316925];const d=[0.12076871715699179,0.9926806721983935];const v=d.map(x=>800*x);console.log('cross',L[0]*v[1]-L[1]*v[0],'x6',6*(L[0]*v[1]-L[1]*v[0]),'K',0.5*6*640000);}
// B3 tof/neck: shot 3 arrival
console.log('cos for plate', 1/Math.sqrt(1+0.0193**2));
