// ---------------- pixel helpers ----------------
function pline(x0,y0,x1,y1,t,col){
  x0=Math.round(x0); y0=Math.round(y0); x1=Math.round(x1); y1=Math.round(y1);
  const dx=Math.abs(x1-x0), dy=-Math.abs(y1-y0), sx=x0<x1?1:-1, sy=y0<y1?1:-1;
  let err=dx+dy; ctx.fillStyle=col; const h=t>>1;
  for(;;){
    ctx.fillRect(x0-h,y0-h,t,t);
    if (x0===x1 && y0===y1) break;
    const e2=2*err; if (e2>=dy){ err+=dy; x0+=sx; } if (e2<=dx){ err+=dx; y0+=sy; }
  }
}
function disc(cx,cy,r,col){
  cx=Math.round(cx); cy=Math.round(cy); r=Math.round(r); if (r<0) return; ctx.fillStyle=col;
  for (let dy=-r; dy<=r; dy++){ const w=Math.floor(Math.sqrt(Math.max(0,r*r-dy*dy+r*0.4))); ctx.fillRect(cx-w, cy+dy, 2*w+1, 1); }
}
function spikes(x,y,r0,r1,t,col){
  for (let k=0;k<8;k++){ const a=k*Math.PI/4, c=Math.cos(a), s=Math.sin(a); pline(x+c*r0,y+s*r0,x+c*r1,y+s*r1,t,col); }
}
const lerp = (a,b,u) => a+(b-a)*u;
function drawHit(e){
  const f = Math.min(4, Math.floor(e.age/(4*TICK))), x=e.x, y=e.y, pal=e.pal, s=e.s||1;
  const R = v => Math.max(1, Math.round(v*s)), th = v => Math.max(1, Math.round(v*s));
  if (f===0){ disc(x,y,R(5),pal.pale); spikes(x,y,R(3),R(9),th(2),pal.white); disc(x,y,R(3),pal.white); }
  else if (f===1){ spikes(x,y,R(2),R(13),th(4),pal.dark); disc(x,y,R(8),pal.dark); spikes(x,y,R(2),R(13),th(2),pal.main); disc(x,y,R(7),pal.main); disc(x,y,R(4),pal.white); }
  else if (f===2){ spikes(x,y,R(5),R(12),th(4),pal.dark); spikes(x,y,R(5),R(12),th(2),pal.main); disc(x,y,R(5),pal.dark); disc(x,y,R(4),pal.pale); }
  else if (f===3){ spikes(x,y,R(8),R(12),th(3),pal.dark); spikes(x,y,R(8),R(12),1,pal.main); }
  else { for (let k=0;k<8;k++){ const a=k*Math.PI/4; ctx.fillStyle=pal.main; ctx.fillRect(Math.round(x+Math.cos(a)*R(13)),Math.round(y+Math.sin(a)*R(13)),2,2); } }
}
function drawVines(e){
  const G = PAL.grass, k = e.age/TICK;
  for (const v of e.v){
    const kv = k - v.delay; if (kv<0) continue;
    const root = {x:v.rx, y:v.ry}, up = {x:v.rx+e.dx*14, y:v.ry-24}, gr = {x:v.gx, y:v.gy};
    let tip, lift;
    if (kv<8){ const u=kv/8, w=u*u*(3-2*u); tip={x:lerp(root.x,up.x,w), y:lerp(root.y,up.y,w)}; lift=10+8*w; }
    else if (kv<12){ const u=(kv-8)/4; tip={x:lerp(up.x,gr.x,u*u), y:lerp(up.y,gr.y,u*u)}; lift=18*(1-u)+4*u; }
    else if (kv<22){ tip=gr; lift=4; }
    else if (kv<34){ const u=(kv-22)/12; tip={x:lerp(gr.x,root.x,u), y:lerp(gr.y,root.y,u)}; lift=4+8*u; }
    else continue;
    const cx = (root.x+tip.x)/2, cy = (root.y+tip.y)/2 - lift;
    const pts = [];
    for (let i=0;i<=14;i++){ const t=i/14, a=(1-t)*(1-t), b=2*(1-t)*t, c=t*t; pts.push([a*root.x+b*cx+c*tip.x, a*root.y+b*cy+c*tip.y]); }
    const pass = (t,col,dy)=>{ for (let i=0;i<pts.length-1;i++) pline(pts[i][0],pts[i][1]+(dy||0),pts[i+1][0],pts[i+1][1]+(dy||0),t,col); };
    pass(5,G.dark); pass(3,G.main); pass(1,G.pale,-1);
    disc(tip.x,tip.y,3,G.dark); disc(tip.x,tip.y,2,G.main); disc(tip.x-1,tip.y-1,1,G.pale);
    if (kv>=12 && kv<24){
      const f = Math.floor((kv-12)/3);
      const puff = ['#e6d9a6','#c9b87c'];
      for (let j=0;j<4;j++){
        const side = (j%2?1:-1), up2 = j<2?1:0;
        disc(gr.x+side*(4+f*3+up2*2), gr.y+2-up2*(2+f), Math.max(1,3-f), puff[up2]);
      }
      for (let j=0;j<4;j++){
        const a = j*Math.PI/2+0.6;
        ctx.fillStyle = G.main; ctx.fillRect(Math.round(gr.x+Math.cos(a)*(5+f*4)), Math.round(gr.y-3+Math.sin(a)*(3+f*2)-f*2), 2, 2);
      }
    }
  }
}
function drawSeed(p){
  const f = Math.floor(p.age/(4*TICK))%2, A = PAL.grass;
  const L = Math.hypot(p.vx,p.vy)||1, ux=p.vx/L, uy=p.vy/L;
  disc(p.x-ux*7, p.y-uy*7, 1, A.main);
  disc(p.x,p.y,4,A.dark); disc(p.x,p.y,3,'#8bd45a'); disc(p.x,p.y,2,A.pale);
  ctx.fillStyle = A.white; ctx.fillRect(Math.round(p.x)-1+f, Math.round(p.y)-1, 1, 1);
  ctx.fillStyle = A.dark; ctx.fillRect(Math.round(p.x)+(f?1:-2), Math.round(p.y)+1, 1, 1);
}
function drawLeaf(p){
  const G = p.type==='mleaf' ? {dark:'#26224a', main:p.col, pale:'#ffffff'} : PAL.grass;
  let ang, len;
  if (p.state==='hover'){
    const d = aimDir(p.x,p.y); ang = Math.atan2(d.y,d.x)+Math.floor(p.age/(4*TICK))*Math.PI/4; len = Math.min(5, 1+Math.floor(p.age/(2*TICK)));
  } else { ang = Math.atan2(p.vy,p.vx); len = (Math.floor(p.age/(3*TICK))%2) ? 9 : 7; }
  const c=Math.cos(ang), s=Math.sin(ang), x0=p.x-c*len/2, y0=p.y-s*len/2, x1=p.x+c*len/2, y1=p.y+s*len/2;
  pline(x0,y0,x1,y1,4,G.dark); pline(x0,y0,x1,y1,2,G.main); pline(x0+c,y0+s,x1,y1,1,G.pale);
  disc(x1,y1,1,G.dark); ctx.fillStyle = G.pale; ctx.fillRect(Math.round(x1),Math.round(y1),1,1);
  if (p.type==='mleaf' && p.state!=='hover'){ ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(p.x-c*9), Math.round(p.y-s*9), 1, 1); ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x-c*12), Math.round(p.y-s*12), 1, 1); }
}
function drawPowder(q){
  if (q.age<0) return;
  const ramp = RAMPS[q.pal];
  if (ramp){
    const u0 = q.age/q.life, ci = Math.min(4, Math.floor(u0*5)), r0 = (q.pal==='ice' ? 1 : 1) + Math.floor(u0*2.6);
    if (u0>0.8 && Math.floor(q.age/(3*TICK))%2) return;
    disc(q.x,q.y,r0,ramp[ci]); return;
  }
  const u = q.age/q.life, r = 1+Math.floor(u*2.4);
  if (u>0.65 && Math.floor(q.age/(3*TICK))%2) return;
  const A = PAL[q.pal||'poison'];
  disc(q.x,q.y,r+1,A.dark); disc(q.x,q.y,r, u<0.5?A.main:A.mid);
  if (r>=2){ ctx.fillStyle=A.pale; ctx.fillRect(Math.round(q.x)-1,Math.round(q.y)-1,1,1); }
}
function drawBubble(e){
  const u = e.age/e.dur, y = e.y - u*14, A = PAL.poison, r = u<0.5?1:2;
  if (u>0.8 && Math.floor(e.age/(3*TICK))%2) return;
  disc(e.x,y,r+1,A.dark); disc(e.x,y,r,A.main); ctx.fillStyle=A.pale; ctx.fillRect(Math.round(e.x),Math.round(y)-1,1,1);
}
function drawHeal(e){
  const u = e.age/e.dur, A = PAL.grass;
  for (let i=0;i<3;i++){
    const x = Math.round(e.x-8+i*8), y = Math.round(e.y-6-u*14-(i%2)*4);
    ctx.fillStyle = A.dark; ctx.fillRect(x-2,y-1,5,3); ctx.fillRect(x-1,y-2,3,5);
    ctx.fillStyle = '#7dff8a'; ctx.fillRect(x-1,y,3,1); ctx.fillRect(x,y-1,1,3);
  }
}
const hash = (i,k) => { const v = Math.sin(i*12.9898 + k*78.233)*43758.5453; return v - Math.floor(v); };
function drawDust(e){
  const u = e.age/e.dur, r = Math.max(1, Math.round(3-u*2)), col = u<0.5 ? '#e6d9a6' : '#c9b87c';
  disc(e.x-3-u*4, e.y-u*3, r, col); disc(e.x+3+u*4, e.y-u*3, r, col);
}
function drawSparkle(e){
  if (e.age<0) return;
  const u = e.age/e.dur, x = Math.round(e.x), y = Math.round(e.y-u*16), big = u>0.2 && u<0.7;
  const c1 = e.col==='steel' ? '#e4ebf5' : '#d2ffb0', c2 = e.col==='steel' ? '#9fb0c8' : '#7dff8a';
  ctx.fillStyle = c1; ctx.fillRect(x,y,1,1);
  if (big){ ctx.fillStyle = c2; ctx.fillRect(x-1,y,3,1); ctx.fillRect(x,y-1,1,3); ctx.fillStyle = '#ffffff'; ctx.fillRect(x,y,1,1); }
}
function drawRing2(e){
  const u = e.age/e.dur, r = 6+u*20;
  for (let k=0;k<20;k++){
    if (u>0.6 && k%2) continue;
    const a = k*Math.PI*2/20;
    const wc = e.col==='water';
    ctx.fillStyle = wc ? PAL.water.dark : PAL.grass.dark; ctx.fillRect(Math.round(e.x+Math.cos(a)*r)-1, Math.round(e.y+Math.sin(a)*r*0.5)-1, 3, 3);
    ctx.fillStyle = wc ? '#9fd2ff' : '#9dff7a'; ctx.fillRect(Math.round(e.x+Math.cos(a)*r), Math.round(e.y+Math.sin(a)*r*0.5), 1, 1);
  }
}
function drawWave(e){
  const half = 35*Math.PI/180, range = 92, u = e.age/e.dur, front = Math.min(range, e.age*120);
  const A = PAL.poison, fade = u>0.7 && Math.floor(e.age/(3*TICK))%2;
  if (fade) return;
  // sludge bubbles inside the cone
  for (let i=0;i<26;i++){
    const rr = 8+hash(i,1)*(range-8); if (rr>front-3) continue;
    const a = e.ang + (hash(i,2)*2-1)*half*0.9, bx = e.x+Math.cos(a)*rr, by = e.y+Math.sin(a)*rr;
    const pop = Math.floor(e.age/(4*TICK)) + Math.floor(hash(i,3)*3);
    const r = 1 + (pop%3===0 ? 2 : pop%3===1 ? 1 : 0);
    disc(bx,by,r+1,A.dark); disc(bx,by,r,A.main); if (r>=2){ ctx.fillStyle = A.pale; ctx.fillRect(Math.round(bx)-1, Math.round(by)-1, 1, 1); }
  }
  // wave fronts
  for (let w=0; w<3; w++){
    const r = front - w*9; if (r<8) continue;
    const steps = Math.max(8, Math.round(r*half*2/3)), pts = [];
    for (let i=0;i<=steps;i++){ const a = e.ang - half + (2*half)*i/steps, wob = Math.sin(i*0.9+e.age*18+w)*1.2; pts.push([e.x+Math.cos(a)*(r+wob), e.y+Math.sin(a)*(r+wob)]); }
    const th = w===0 ? [8,5,2] : [6,3,1];
    const pass = (t,col)=>{ for (let i=0;i<pts.length-1;i++) pline(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],t,col); };
    pass(th[0],A.dark); pass(th[1], w===0 ? A.main : A.mid); if (w===0) pass(th[2],A.pale);
  }
}
function clipLen(ox,oy,c,s,L){
  let tmax = L;
  const lim = (o,d,lo,hi)=>{ if (d>0) tmax = Math.min(tmax,(hi-o)/d); else if (d<0) tmax = Math.min(tmax,(lo-o)/d); };
  lim(ox,c,-30,world.w+30); lim(oy,s,-30,world.h+30);
  return Math.max(0,tmax);
}
function drawSolar(){
  const c = P.channel; if (!c || c.kind!=='solar') return;
  const ox = P.x, oy = bodyY(P)-4;
  if (c.phase==='charge'){
    const u = Math.min(1,c.t/0.8), r = 2+Math.round(u*5), a = P.row, d = aimDir(ox,oy);
    const px = ox+d.x*10, py = oy+d.y*6;
    disc(px,py,r+1,'#6b8f1a'); disc(px,py,r,'#e4ff9a'); disc(px,py,Math.max(1,r-3),'#ffffff');
    return;
  }
  const dx = Math.cos(c.ang), dy = Math.sin(c.ang), sx = ox+dx*10, sy = oy+dy*6;
  const len = clipLen(sx,sy,dx,dy,460), ex = sx+dx*len, ey = sy+dy*len;
  const k = Math.abs(dx)+Math.abs(dy);
  const grow = Math.min(1,c.bt/0.1);
  const flick = Math.floor(c.bt/(3*TICK))%2 ? 2 : 0;
  const w = v => Math.max(2, Math.round((v+flick)*grow/k));
  const solarPath=()=>{ctx.beginPath();ctx.moveTo(sx,sy);const bend=!!hurricane||!!(window.PMD_MP&&window.PMD_MP.netHurricane);for(let j=1;j<=32;j++){const t=j/32,off=bend?Math.sin(t*40+performance.now()/65)*8:0;ctx.lineTo(sx+dx*len*t-dy*off,sy+dy*len*t+dx*off);}ctx.stroke();}; ctx.lineCap='round';ctx.strokeStyle='#2f6b22';ctx.lineWidth=w(20);solarPath();ctx.strokeStyle='#7ddc4a';ctx.lineWidth=w(15);solarPath();ctx.strokeStyle='#e4ff9a';ctx.lineWidth=w(10);solarPath();ctx.strokeStyle='#ffffff';ctx.lineWidth=w(4);solarPath();
  disc(sx,sy,Math.round(8*grow),'#2f6b22'); disc(sx,sy,Math.round(6*grow),'#e4ff9a'); disc(sx,sy,Math.round(3*grow),'#ffffff');
  const kk = Math.floor(c.bt/(3*TICK)), px = -dy, py = dx;
  for (let i=0;i<16;i++){
    const along = hash(i,kk)*len, off = (hash(i,kk+7)*2-1)*(10+4*grow);
    ctx.fillStyle = hash(i,kk+3)>0.5 ? '#ffffff' : '#e4ff9a';
    ctx.fillRect(Math.round(sx+dx*along+px*off), Math.round(sy+dy*along+py*off), 2, 2);
  }
}
function drawMotes(){
  for (const m of motes){
    const u = m.age/m.life, tx = P.x, ty = bodyY(P)-4;
    const x = m.sx+(tx-m.sx)*u, y = m.sy+(ty-m.sy)*u;
    ctx.fillStyle = u<0.7 ? '#e4ff9a' : '#ffffff'; ctx.fillRect(Math.round(x),Math.round(y),2,2);
  }
}
function drawProj(p){
  const A = PAL, f2 = Math.floor(p.age/(4*TICK))%2;
  const L = Math.hypot(p.vx,p.vy)||1, ux = p.vx/L, uy = p.vy/L, px = -uy, py = ux;
  if (p.style==='sound'){
    const r = 5+Math.floor(p.age/(3*TICK))%3*2;
    const bugWave = p.move === 'bugbuzz';
    const waveColors = bugWave ? [[5,'#174f27'],[3,'#49d64e'],[1,'#d9ffd1']] : [[5,'#5a2a6a'],[3,'#ff8ad8'],[1,'#ffffff']];
    for (const [w,col] of waveColors){ let q = null; for (let i=-4;i<=4;i++){ const a = i/4*1.0, X = p.x+ux*Math.cos(a)*r*0.7+px*Math.sin(a)*r, Y = p.y+uy*Math.cos(a)*r*0.7+py*Math.sin(a)*r; if (q) pline(q[0],q[1],X,Y,w,col); q = [X,Y]; } }
  } else if (p.style==='web'){
    disc(p.x,p.y,3,'#8c8c96'); disc(p.x,p.y,2,'#ffffff'); pline(p.x-ux*8,p.y-uy*8,p.x,p.y,1,'#e8e8f0');
  } else if (p.style==='poisonball'){
    disc(p.x,p.y,9,'rgba(111,24,145,0.25)'); disc(p.x,p.y,7,'#57206f'); disc(p.x,p.y,5,'#9f45c7'); disc(p.x-2,p.y-2,2,'#f0c8ff');
  } else if (p.style==='sting'){
    pline(p.x-ux*5,p.y-uy*5,p.x+ux*3,p.y+uy*3,3,'#3b1456'); pline(p.x-ux*4,p.y-uy*4,p.x+ux*3,p.y+uy*3,1,'#e7c4ff');
  } else if (p.style==='ember'){
    disc(p.x-ux*8, p.y-uy*8, 1, RAMPS.flame[3]); disc(p.x-ux*5, p.y-uy*5, 2, RAMPS.flame[2]);
    disc(p.x,p.y,4,A.fire.dark); disc(p.x,p.y,3,A.fire.main); disc(p.x,p.y,2,RAMPS.flame[1]); disc(p.x+(f2?1:0),p.y,1,RAMPS.flame[0]);
  } else if (p.style==='airslash'){
    const w = f2 ? 1 : 0, pts = [];
    for (let i=-4;i<=4;i++){ const a = i/4*1.15, rr = 9+w; pts.push([p.x+ux*Math.cos(a)*rr*0.7 + px*Math.sin(a)*rr, p.y+uy*Math.cos(a)*rr*0.7 + py*Math.sin(a)*rr]); }
    const pass = (t,col)=>{ for (let i=0;i<pts.length-1;i++) pline(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],t,col); };
    pass(5,A.flying.dark); pass(3,'#bfe6ff'); pass(1,'#ffffff');
  } else if (p.style==='water'){
    disc(p.x-ux*9,p.y-uy*9,1,A.water.main); disc(p.x-ux*5,p.y-uy*5,2,A.water.main);
    disc(p.x,p.y,5,A.water.dark); disc(p.x,p.y,4,A.water.main); disc(p.x,p.y,2,A.water.pale); ctx.fillStyle='#fff'; ctx.fillRect(Math.round(p.x)-1,Math.round(p.y)-2,1,1);
  } else if (p.style==='hydro'){
    for (let i=1;i<=3;i++) disc(p.x-ux*i*7, p.y-uy*i*7, 7-i*1.5, i%2?A.water.main:A.water.pale);
    disc(p.x,p.y,9,A.water.dark); disc(p.x,p.y,8,A.water.main); disc(p.x,p.y,5,A.water.pale); disc(p.x-ux*2,p.y-uy*2,2,'#ffffff');
    for (let i=0;i<4;i++){ const o = (f2?1:-1)*(i%2?1:-1)*6; ctx.fillStyle = A.water.pale; ctx.fillRect(Math.round(p.x-ux*(4+i*5)+px*o), Math.round(p.y-uy*(4+i*5)+py*o), 2, 2); }
  } else if (p.style==='bubble'){
    const wob = Math.sin(p.age*14+p.wob)*1.2, bx = p.x+px*wob, by = p.y+py*wob, r = p.r;
    disc(bx,by,r+1,A.water.main); disc(bx,by,r,'#9fd2ff'); disc(bx,by,Math.max(1,r-2),'#e6f6ff');
    ctx.fillStyle='#ffffff'; ctx.fillRect(Math.round(bx)-1,Math.round(by)-1,1,1);
  }
}
function drawMelee(e){
  const u = e.age/e.dur, f = Math.min(3, Math.floor(u*4)), c = Math.cos(e.ang), s = Math.sin(e.ang), px = -s, py = c;
  const col = e.fx==='fang' ? {dark:'#7a1c05', main:'#ffb02a', tip:'#fff3a0'} : e.fx==='poison' ? {dark:'#321044', main:'#bd63e8', tip:'#f4d5ff'} : {dark:'#3a3f4a', main:'#ffffff', tip:'#ffffff'};
  const gap = [11,8,2,3][f];
  for (const sg of [-1,1]){
    const bx = e.x+px*(gap+6)*sg, by = e.y+py*(gap+6)*sg, tx = e.x+px*gap*sg+c*2, ty = e.y+py*gap*sg+s*2;
    pline(bx,by,tx,ty,4,col.dark); pline(bx,by,tx,ty,2,col.main);
    ctx.fillStyle = col.tip; ctx.fillRect(Math.round(tx),Math.round(ty),1,1);
    if (e.fx==='fang' && f<3){ disc(bx-c*2,by-s*2,2,RAMPS.flame[2]); disc(bx-c*2,by-s*2-1,1,RAMPS.flame[1]); }
  }
  if (f===2){ disc(e.x,e.y,3,'#ffffff'); spikes(e.x,e.y,3,8,1,'#ffffff'); }
}
function drawSmoke(e){
  if (e.age<0) return;
  const u = e.age/e.dur, n = e.small ? 3 : 6, ramp = ['#dfe3e8','#b8bec8','#8d939e'];
  if (u>0.75 && Math.floor(e.age/(3*TICK))%2) return;
  for (let i=0;i<n;i++){
    const a = hash(i,5)*Math.PI*2, r = u*(6+hash(i,6)*(e.small?6:14)), sz = (e.small?1:2)+Math.floor(u*3);
    disc(e.x+Math.cos(a)*r, e.y+Math.sin(a)*r*0.7-u*6, sz, ramp[Math.min(2,Math.floor(u*3))]);
  }
}
function drawFlamelet(e){
  const u = e.age/e.dur, y = e.y-u*11;
  disc(e.x, y, u<0.5?2:1, RAMPS.flame[Math.min(4,Math.floor(u*5))]);
}
function drawLiq(e){
  const q = e.q, W = PAL.water;
  if (e.age < e.delay){
    const blink = Math.floor(e.age/(4*TICK))%2, u = e.age/e.delay;
    for (let k=0;k<28;k++){
      const a = k*Math.PI*2/28;
      ctx.fillStyle = blink ? W.pale : W.main; ctx.fillRect(Math.round(e.x+Math.cos(a)*q.r), Math.round(e.y+Math.sin(a)*q.r*0.75), 2, 2);
      if (k%2===0){ const rr = q.r*(1.8-0.8*u); ctx.fillStyle = W.dark; ctx.fillRect(Math.round(e.x+Math.cos(a)*rr), Math.round(e.y+Math.sin(a)*rr*0.75), 1, 1); }
    }
    return;
  }
  const t = e.age-e.delay, f = Math.min(4, Math.floor(t/(4*TICK)));
  drawHit({x:e.x, y:e.y-6, age:Math.min(t, 0.32), pal:W, s:1.9});
  for (let i=0;i<1;i++){
    const r = t*180 - i*9; if (r<5 || r>q.waveR) continue;
    const fade = r>q.waveR*0.8 && Math.floor(t/(3*TICK))%2;
    if (fade) continue;
    const N = Math.max(18, Math.round(r*0.9));
    for (let k=0;k<N;k++){
      const a = k*Math.PI*2/N, x = e.x+Math.cos(a)*r, y = e.y+Math.sin(a)*r*0.75;
      ctx.fillStyle = W.dark; ctx.fillRect(Math.round(x)-1, Math.round(y)-1, 3, 3);
      ctx.fillStyle = i===0 ? W.pale : W.main; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
}
function drawPlayerFx(){
  const tt = performance.now()/1000, B = P.buffs, bx = P.x, by = bodyY(P);
  if (B.aqua){
    for (let k=0;k<12;k++){
      const a = tt*2.2 + k*Math.PI*2/12, x = bx+Math.cos(a)*15, y = by+4+Math.sin(a)*7;
      disc(x,y,1,PAL.water.main); ctx.fillStyle = '#e6f6ff'; ctx.fillRect(Math.round(x),Math.round(y)-1,1,1);
    }
  }
  if (B.blitz){
    for (let k=0;k<10;k++){
      const a = tt*4 + k*Math.PI*2/10, r = 19+Math.sin(tt*9+k)*2, x = bx+Math.cos(a)*r, y = by+Math.sin(a)*r*0.8;
      disc(x,y,3,RAMPS.flame[3]); disc(x,y,2,RAMPS.flame[2]); disc(x,y-1,1,RAMPS.flame[1]);
    }
  }
  if (B.iron){
    const k = Math.floor(tt*8)%3; ctx.fillStyle = '#ffffff';
    for (let i=0;i<3;i++) ctx.fillRect(Math.round(bx-10+((i*7+k*5)%22)), Math.round(by-8+((i*5+k*3)%18)), 1, 1);
  }
  const D = P.dash;
  if (D && D.ring==='flame'){
    for (let k=0;k<8;k++){
      const a = tt*16 + k*Math.PI/4, x = bx+Math.cos(a)*17, y = by+Math.sin(a)*13;
      disc(x,y,3,RAMPS.flame[3]); disc(x,y,2,RAMPS.flame[2]); disc(x,y-1,1,RAMPS.flame[0]);
    }
  } else if (D && D.ring==='water'){
    // Aqua Jet: a compact, directional pixel-water surge. Build a stepped
    // wave crest and broken foam tiles behind the rider; no circular ring or
    // long straight water strings.
    const ux=D.dx, uy=D.dy, px=-uy, py=ux, phase=Math.floor(tt*12);
    const wx=bx-ux*8, wy=by-uy*5;
    const waveRows=[
      {back:8, half:11, color:PAL.water.dark, size:4},
      {back:13, half:9, color:PAL.water.main, size:4},
      {back:17, half:6, color:PAL.water.pale, size:3}
    ];
    for(const row of waveRows){
      for(let k=-3;k<=3;k++){
        const side=k*row.half/3;
        const stagger=((k+phase)%2)*1.5;
        const x=wx-ux*(row.back+stagger)+px*side;
        const y=wy-uy*(row.back+stagger)+py*side;
        ctx.fillStyle=row.color;
        ctx.fillRect(Math.round(x),Math.round(y),row.size,row.size);
      }
    }
    // Scattered foam pixels trail in the direction opposite the dash.
    for(let k=0;k<9;k++){
      const back=19+((k*13+phase*3)%22);
      const side=(((k*7)%11)-5)*2.2;
      const x=bx-ux*back+px*side, y=by-uy*back+py*side;
      ctx.fillStyle=k%3===0?'#ffffff':PAL.water.pale;
      ctx.fillRect(Math.round(x),Math.round(y),k%3===0?3:2,1);
    }
  } else if (D && D.fx==='surf'){
    // Surf: a broad Mystery Dungeon-style pixel wave under the rider.
    // The crest is made of stepped blocks, with a dark blue body and bright
    // foam pixels; its silhouette is perpendicular to the travel direction.
    const ux=D.dx, uy=D.dy, px=-uy, py=ux, phase=Math.floor(tt*7);
    const wx=bx-ux*5, wy=by-uy*3;
    const crest=[
      {back:2, half:22, color:PAL.water.dark, size:6},
      {back:6, half:19, color:PAL.water.main, size:5},
      {back:10, half:15, color:PAL.water.pale, size:3}
    ];
    for(let row=0;row<crest.length;row++){
      const band=crest[row];
      for(let k=-4;k<=4;k++){
        const side=k*band.half/4;
        const step=((k+phase+row)%3===0)?2:0;
        const x=wx-ux*(band.back+step)+px*side;
        const y=wy-uy*(band.back+step)+py*side;
        ctx.fillStyle=band.color;
        ctx.fillRect(Math.round(x),Math.round(y),band.size,band.size);
      }
    }
    // Pixel foam along the front edge of the wave and a short wake behind it.
    for(let k=0;k<13;k++){
      const side=(k-6)*4;
      const bob=((k+phase)%3===0)?-2:0;
      const x=wx-ux*(7+bob)+px*side, y=wy-uy*(7+bob)+py*side;
      ctx.fillStyle=k%4===0?'#ffffff':PAL.water.pale;
      ctx.fillRect(Math.round(x),Math.round(y),k%3===0?4:2,2);
    }
    for(let k=0;k<8;k++){
      const back=17+((k*9+phase*2)%20), side=(((k*5)%13)-6)*2.8;
      const x=bx-ux*back+px*side, y=by-uy*back+py*side;
      ctx.fillStyle=k%3===0?PAL.water.main:'#e6f6ff';
      ctx.fillRect(Math.round(x),Math.round(y),k%2?2:3,1);
    }
  } else if (D && D.fx==='rush'){
    // Dragon Rush uses a compact pixel/star trail instead of harsh parallel laser lines.
    for (let k=0;k<13;k++){
      const back = 8 + ((k*11 + Math.floor(tt*34)) % 42);
      const side = Math.sin(k*2.4 + tt*12) * (3 + (k%3)*2);
      const x = bx-D.dx*back-D.dy*side, y = by-D.dy*back+D.dx*side;
      const size = k%4===0 ? 3 : (k%2 ? 1 : 2);
      ctx.fillStyle = k%3===0 ? '#f3e8ff' : (k%2 ? '#b99aff' : '#8055df');
      ctx.fillRect(Math.round(x),Math.round(y),size,size);
      if(k%4===0){ ctx.fillStyle='#e9d5ff'; ctx.fillRect(Math.round(x-2),Math.round(y-2),1,1); ctx.fillRect(Math.round(x+size+1),Math.round(y+1),1,1); }
    }
  }
  // Dragon Rush's one-second windup: violet pixels gather around Charizard before launch.
  if (P.channel && P.channel.kind==='windup' && CUR && CUR.name==='Charizard' && P.channel.slot==='rmb'){
    const charge = Math.max(0,Math.min(1,(Number(P.channel.t)||0)));
    for(let k=0;k<18;k++){
      const a=tt*3.2+k*Math.PI*2/18, r=7+charge*13+(k%3)*2;
      const x=bx+Math.cos(a)*r, y=by-8+Math.sin(a)*r*0.7;
      const size=k%5===0?3:2;
      ctx.fillStyle=k%3===0?'#f3e8ff':'#9b7bea';
      ctx.fillRect(Math.round(x),Math.round(y),size,size);
    }
  }
}
function drawZzz(e){
  const u = e.age/e.dur, x = Math.round(e.x+u*6), y = Math.round(e.y-u*14), s = u<0.3 ? 2 : 3;
  const z = (cx,cy,sz,c)=>{ ctx.fillStyle=c; ctx.fillRect(cx,cy,sz+1,1); ctx.fillRect(cx,cy+sz,sz+1,1); for (let i=0;i<=sz;i++) ctx.fillRect(cx+sz-i,cy+i,1,1); };
  z(x-1,y-1,s+1,PAL.sleep.dark); z(x,y,s,'#ffffff');
}
function drawOrb(o){
  const A = PAL.grass, f = Math.floor(performance.now()/(4*1000/60))%2;
  disc(o.x,o.y,3+f,A.dark); disc(o.x,o.y,2+f,'#7dff8a'); disc(o.x,o.y,1,A.white);
}
function drawSprout(){
  if (!T.seed || T.dead) return;
  const h = Math.min(7, 2+Math.floor(T.seed.age/0.1)), x = Math.round(T.x+10), y = Math.round(T.y);
  ctx.fillStyle = '#1f4a1c'; ctx.fillRect(x-1,y-h-1,3,h+2);
  ctx.fillStyle = '#58c24a'; ctx.fillRect(x,y-h,1,h);
  if (h>=4){ ctx.fillStyle='#1f4a1c'; ctx.fillRect(x-4,y-h-1,4,3); ctx.fillRect(x+1,y-h-2,4,3); ctx.fillStyle='#8bd45a'; ctx.fillRect(x-3,y-h,3,1); ctx.fillRect(x+1,y-h-1,3,1); }
}

// ---------------- rendering ----------------
const cssCache = {}; let cssStamp = 0;
function getCss(v){
  const now = performance.now();
  if (now - cssStamp > 500){ for (const k in cssCache) delete cssCache[k]; cssStamp = now; }
  return cssCache[v] || (cssCache[v] = getComputedStyle(document.documentElement).getPropertyValue(v).trim());
}
function drawFloor(){
  const Tl = 20, w = world.w, h = world.h, WT = 28, WS = 14, WB = 12;
  for (let y=0;y<h;y+=Tl) for (let x=0;x<w;x+=Tl){
    ctx.fillStyle = (((x/Tl)+(y/Tl))%2===0) ? getCss('--arena-a') : getCss('--arena-b');
    ctx.fillRect(x,y,Tl,Tl);
  }
  const brick = (x0,y0,x1,y1)=>{
    ctx.fillStyle = '#4a4f5e'; ctx.fillRect(x0,y0,x1-x0,y1-y0);
    for (let y=y0,r=0;y<y1;y+=7,r++){ ctx.fillStyle = '#2e323d'; ctx.fillRect(x0,y,x1-x0,1); for (let x=x0+(r%2)*8;x<x1;x+=16) ctx.fillRect(x,y,1,Math.min(7,y1-y)); }
    for (let i=0;i<((x1-x0)*(y1-y0))/260;i++){ ctx.fillStyle = '#585e70'; ctx.fillRect(x0+Math.floor(hash(i,x0+y0)*(x1-x0-3)), y0+Math.floor(hash(i,7+x0)*(y1-y0-2)), 3, 1); }
  };
  brick(0,0,WS,h); brick(w-WS,0,w,h); brick(0,0,w,WT); brick(0,h-WB,w,h);
  ctx.fillStyle = '#8a90a4'; ctx.fillRect(0,0,w,2); ctx.fillRect(0,0,2,h); ctx.fillRect(w-2,0,2,h); ctx.fillRect(0,h-2,w,2);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(WS,WT,w-2*WS,3); ctx.fillRect(WS,WT,3,h-WT-WB); ctx.fillRect(w-WS-3,WT,3,h-WT-WB); ctx.fillRect(WS,h-WB-3,w-2*WS,3);
}
function drawEnt(e, o){
  const a = e.A[e.anim]; if (!a || !a.image.complete) return;
  ctx.globalAlpha = (o && o.alpha!=null) ? o.alpha : 1;
  const rr = Math.min(e.row, (a.rows||8)-1), row = a.anchors[rr], anc = row[Math.min(e.frame,row.length-1)];
  const dx = Math.round(e.x-anc[0]), dy = Math.round(e.y-anc[1]-(e.z||0));
  if (!(o && o.noShadow)){ ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(Math.round(e.x), Math.round(e.y), (e.sh||9), (e.sh||9)*0.45, 0, 0, Math.PI*2); ctx.fill(); }
  const sx = e.frame*a.fw, sy = rr*a.fh;
  if (o && (o.flash || o.hue || o.tint)){
    tctx.clearRect(0,0,tmp.width,tmp.height);
    tctx.save(); if (o.hue) tctx.filter = 'hue-rotate('+o.hue+'deg)';
    tctx.drawImage(a.image, sx, sy, a.fw, a.fh, 0, 0, a.fw, a.fh); tctx.restore();
    if (o.tint){ tctx.globalCompositeOperation='source-atop'; tctx.fillStyle=o.tint; tctx.fillRect(0,0,a.fw,a.fh); tctx.globalCompositeOperation='source-over'; }
    if (o.flash){ tctx.globalCompositeOperation='source-atop'; tctx.fillStyle='rgba(255,255,255,.9)'; tctx.fillRect(0,0,a.fw,a.fh); tctx.globalCompositeOperation='source-over'; }
    ctx.drawImage(tmp, 0, 0, a.fw, a.fh, dx, dy, a.fw, a.fh);
  } else {
    ctx.drawImage(a.image, sx, sy, a.fw, a.fh, dx, dy, a.fw, a.fh);
  }
  ctx.globalAlpha = 1;
  if (dbg.checked){
    ctx.strokeStyle='#ffd34d'; ctx.lineWidth=1; ctx.strokeRect(dx+.5,dy+.5,a.fw-1,a.fh-1);
    ctx.fillStyle='#ff4d4d'; ctx.fillRect(Math.round(e.x)-1,Math.round(e.y)-1,3,3);
  }
}
function drawBar(e, yOff, color){
  if (e.dead) return;
  const w = 30, x = Math.round(e.x-w/2), y = Math.round(e.y-yOff);
  ctx.fillStyle='#14171a'; ctx.fillRect(x-1,y-1,w+2,6);
  ctx.fillStyle='#3a1f1f'; ctx.fillRect(x,y,w,4);
  ctx.fillStyle = e.hp/e.maxhp>0.3 ? color : '#e0503c'; ctx.fillRect(x,y,Math.round(w*e.hp/e.maxhp),4);
}
function drawDebugShapes(){
  const bx = P.x, by = bodyY(P), d = aimDir(bx,by), ang = Math.atan2(d.y,d.x), sludge = SLOTS.E.kind==='sludge', half = (sludge?35:30)*Math.PI/180;
  ctx.strokeStyle = 'rgba(190,120,255,.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(bx,by); ctx.arc(bx,by,sludge?92:84,ang-half,ang+half); ctx.closePath(); ctx.stroke();
  if ((SLOTS.rmb && SLOTS.rmb.kind==='solar')){ ctx.strokeStyle = 'rgba(255,255,120,.6)'; const px=-d.y*17, py=d.x*17; ctx.beginPath(); ctx.moveTo(bx+px,by+py); ctx.lineTo(bx+px+d.x*460,by+py+d.y*460); ctx.moveTo(bx-px,by-py); ctx.lineTo(bx-px+d.x*460,by-py+d.y*460); ctx.stroke(); }
  if (SLOTS.E.kind==='vines'){
    const g = aimDir(P.x,P.y), px = -g.y, py = g.x;
    ctx.strokeStyle = 'rgba(120,255,120,.7)';
    for (const s of [-1,1]){ ctx.beginPath(); ctx.arc(P.x+g.x*44+px*10*s, P.y+g.y*44+py*10*s, 23, 0, Math.PI*2); ctx.stroke(); }
  }
  if (!(window.PMD_MP && window.PMD_MP.active && !window.PMD_MP.peerPresent)){ ctx.strokeStyle = 'rgba(255,120,120,.7)'; ctx.beginPath(); ctx.arc(T.x, bodyY(T), 11, 0, Math.PI*2); ctx.stroke(); }
}
function draw(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = '#1b231e'; ctx.fillRect(0,0,cv.width,cv.height);
  const sh = shakeT>0 ? Math.round((Math.random()*2-1)*shakeMag*Math.min(1,shakeT/0.18)) : 0;
  const sv = shakeT>0 ? Math.round((Math.random()*2-1)*shakeMag*Math.min(1,shakeT/0.18)) : 0;
  ctx.setTransform(S,0,0,S,sh*S,sv*S);
  drawFloor();
  drawSprout(); drawWeb(); drawFlying();
  for (const g of P.trail){ drawEnt({A:P.A, x:g.x, y:g.y, row:g.row, anim:g.anim, frame:g.frame, body:P.body}, {alpha:0.5*(1-g.age/0.25), noShadow:true, tint:g.tint||'rgba(190,255,190,0.55)'}); }
  const pt0 = P.buffs.iron ? 'rgba(200,215,235,0.4)' : P.buffs.blitz ? 'rgba(255,110,40,'+(0.2+0.12*Math.sin(performance.now()/70))+')' : null;
  const pt = P.channel ? (P.channel.kind==='synth' ? 'rgba(255,255,170,'+(0.12+0.1*Math.sin(performance.now()/90))+')' : P.channel.kind==='solar' ? 'rgba(255,255,160,'+(0.1+0.25*Math.min(1,P.channel.t/0.8))+')' : pt0) : pt0;
  const mpHiddenTarget = !!(window.PMD_MP && window.PMD_MP.active && !window.PMD_MP.peerPresent);
  const order = [...(mpHiddenTarget || T.hidden ? [] : [[T,{hue:150, flash:T.flashT>0, tint:T.psn?'rgba(155,74,214,0.30)':T.burn?'rgba(255,120,40,0.28)':T.slow?'rgba(120,200,255,0.32)':null}]]),...(P.hidden?[]:[[P,(pt||P.buffs.invis)?{tint:pt, alpha:P.buffs.invis?0.28:1}:null]])].sort((a,b)=>a[0].y-b[0].y);
  for (const [e,o] of order) if (!(e===P && P.hidden)) drawEnt(e,o);
  drawPlayerFx();
  if (!mpHiddenTarget) drawBar(T, 40, '#58d65b'); drawBar(P, P.body+25, '#58d65b');
  for (const e of effects){
    if (e.type==='hit') drawHit(e); else if (e.type==='vines') drawVines(e);
    else if (e.type==='bubble') drawBubble(e); else if (e.type==='heal') drawHeal(e); else if (e.type==='zzz') drawZzz(e);
    else if (e.type==='dust') drawDust(e); else if (e.type==='sparkle') drawSparkle(e); else if (e.type==='ring2') drawRing2(e); else if (e.type==='wave') drawWave(e);
    else if (e.type==='melee') drawMelee(e); else if (e.type==='smoke') drawSmoke(e); else if (e.type==='liq') drawLiq(e); else if (e.type==='flamelet') drawFlamelet(e); else if (e.type==='laser') drawLaser(e); else if (e.type==='wind') drawWind(e);
  }
  for (const q of parts) drawPowder(q);
  for (const p of projs){ if (p.type==='seed') drawSeed(p); else if (p.type==='proj') drawProj(p); else drawLeaf(p); }
  for (const o of orbs) drawOrb(o);
  drawMotes(); drawSolar(); drawLaserCharge();
  if (dbg.checked) drawDebugShapes();

  ctx.setTransform(1,0,0,1,0,0);
  if (flashA>0){ ctx.fillStyle = 'rgba(255,255,225,'+Math.min(0.5,flashA)+')'; ctx.fillRect(0,0,cv.width,cv.height); }
  ctx.textAlign='center'; ctx.lineJoin='round';
  for (const n of numbers){
    ctx.font = 'bold '+Math.round((n.big?5.4:4.4)*S)+'px ui-monospace,Menlo,Consolas,monospace';
    ctx.globalAlpha = Math.min(1, (0.9-n.age)/0.3);
    const x = (n.x+sh)*S, y = (n.y-n.age*24+sv)*S;
    ctx.lineWidth = 4; ctx.strokeStyle = '#10130f'; ctx.strokeText(n.txt, x, y);
    ctx.fillStyle = n.col; ctx.fillText(n.txt, x, y);
  }
  ctx.globalAlpha = 1;
  // status chips above the opponent
  if (!T.dead && !mpHiddenTarget){
    const chips = []; if (T.seed) chips.push(['SEED','#58c24a']); if (T.psn) chips.push(['PSN','#9b4ad6']); if (T.sleep) chips.push(['SLP','#b9b229']); if (T.burn) chips.push(['BRN','#e0601a']); if (T.slow) chips.push(['SLW','#3a9fd0']);
    ctx.font = 'bold '+Math.round(3.6*S)+'px ui-monospace,Menlo,Consolas,monospace';
    let cx = (T.x+sh)*S - (chips.length*(11*S))/2 + 5.5*S;
    for (const [t,c] of chips){
      ctx.fillStyle = c; ctx.fillRect(cx-5*S, (T.y-50+sv)*S, 10*S, 5*S);
      ctx.fillStyle = '#fff'; ctx.fillText(t, cx, (T.y-46+sv)*S+1); cx += 11*S;
    }
  }
  { const pc = []; const B = P.buffs;
    if (B.invis) pc.push(['INV','#6b7280']); if (B.iron) pc.push(['DEF','#8e9bb0']); if (B.aqua) pc.push(['AQUA','#3f8bff']); if (B.blitz) pc.push(['FLARE','#e0601a']);
    ctx.font = 'bold '+Math.round(3.6*S)+'px ui-monospace,Menlo,Consolas,monospace';
    let px0 = (P.x+sh)*S - (pc.length*(13*S))/2 + 6.5*S;
    for (const [tx,c] of pc){ ctx.fillStyle = c; ctx.fillRect(px0-6*S, (P.y-(P.body+36)+sv)*S, 12*S, 5*S); ctx.fillStyle = '#fff'; ctx.fillText(tx, px0, (P.y-(P.body+32)+sv)*S+1); px0 += 13*S; } }
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([4,6]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(P.x*S, bodyY(P)*S); ctx.lineTo(mouse.x*S, mouse.y*S); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(mouse.x*S, mouse.y*S, 6, 0, Math.PI*2);
  ctx.moveTo(mouse.x*S-10, mouse.y*S); ctx.lineTo(mouse.x*S+10, mouse.y*S);
  ctx.moveTo(mouse.x*S, mouse.y*S-10); ctx.lineTo(mouse.x*S, mouse.y*S+10); ctx.stroke();

  if ($('hHp')) $('hHp').textContent = P.hp+' / '+P.maxhp;
  if ($('hTHp')) $('hTHp').textContent = mpHiddenTarget ? '—' : (T.hp+' / '+T.maxhp);
  if ($('hCd')) $('hCd').textContent = ['click','rmb','Q','E','R','Space','Shift'].filter(k=>SLOTS[k]).map(k=>SLOTS[k].label+' '+(cd[k]>0?cd[k].toFixed(1)+'s':'ready')).join('  ');
}
let last = performance.now();
function loop(now){
  const dt = Math.min(0.05, (now-last)/1000); last = now;
  update(dt); draw(); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

