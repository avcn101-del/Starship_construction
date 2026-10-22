const dt=1/60, E=5;
const att={cx:30.684570331692544,cy:17.248340921336343};
// attacker bow-on: heading +y. turret centre (45,25) in grid.
const tl=[45-att.cx,25-att.cy]; const launch=[-tl[1], tl[0]]; // world offset from attacker CoM at (0,-900)
const L=[launch[0], -900+launch[1]];
console.log('launch',L,'turret offset local',tl);
function tof(cy,faceGridY){ return ((faceGridY-cy)-L[1])/800; }
const cases={
 'R1 bridge face y=10 (cy 16.184)':[16.184166484783013,10],
 'R1 hold/magazine face y=0..: hold bottom y=0':[16.184166484783013,0],
 'R1 magazine, hold face y=0':[16.184166484783013,0],
 'R1d (cy 17.248) hold bottom y=0':[17.248340921336343,0],
 'T-neck neck face y=10 (cy 16.325)':[16.325061930812907,10],
};
for(const [k,[cy,fy]] of Object.entries(cases)){const T=tof(cy,fy);console.log(k,'D=',(fy-cy)-L[1],'ToF',T.toFixed(5),'arrival of shot k at 2k+T; step=',(n=>Math.floor((2*n+T)/dt))(0));}
// step of arrival for k
function stepOf(k,T,anchor=0){return Math.floor((anchor+2*k+T)/dt+1e-9);}
for(const [name,cy,fy,ks] of [['R1 bridge',16.184166484783013,10,[0,1,2,3,4,5,6,7,8,9,10,11]],['T-neck neck',16.325061930812907,10,[0,1,2]],['R1 magazine (hold face y=0)',16.184166484783013,0,[0,1,2]],['R1d hold face',17.248340921336343,0,[0,5,6,7,8]]]){
  const T=tof(cy,fy); console.log(name,'ToF',T.toFixed(5),ks.map(k=>`k${k}:t=${(2*k+T).toFixed(4)} step ${stepOf(k,T)} frac ${(((2*k+T)/dt)%1).toFixed(3)}`).join(' | '));
}
// 900/800 naive
console.log('naive 1.125: step frac',[0,1,2].map(k=>(((2*k+1.125)/dt)%1).toFixed(3)));
