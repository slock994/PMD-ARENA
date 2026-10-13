// Extra mechanics: streams, laser, jump slam, dash steering, dual-cast, AI.
const wrapA = d => { while (d>Math.PI) d -= 2*Math.PI; while (d<-Math.PI) d += 2*Math.PI; return d; };
function streamTick(c, s, st, dt, k){
  const bx = P.x, by = bodyY(P), d = aimDir(bx,by), ang = Math.atan2(d.y,d.x);
  if (st.el==='bubble'){
    c['e'+k] = (c['e'+k]||0) - dt;
    while (c['e'+k]<=0){
      c['e'+k] += st.rate; const a = ang + rnd(-st.spread, st.spread);
      projs.push({type:'proj', style:'bubble', x:bx+d.x*10, y:by+d.y*10, vx:Math.cos(a)*st.speed, vy:Math.sin(a)*st.speed, r:st.r, life:st.life, age:0, move:s.move, mult:st.mult, burn:0, slow:st.slow||0, big:false, ang:a, wob:rnd(0,6)});
    }
    return;
  }
  c['p'+k] = (c['p'+k]||0) + st.pps*dt; const spd = st.range/0.5;
  while (c['p'+k]>=1){
    c['p'+k] -= 1; const a = ang + rnd(-st.half,st.half)*Math.PI/180*0.9, sp = spd*rnd(0.8,1.1);
    parts.push({x:bx+d.x*10, y:by+d.y*8, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, age:0, life:rnd(0.38,0.52), pal:(st.el==='dragon'?'dragon':st.el==='wind'?'wind':'flame')});
  }
  c['t'+k] = (c['t'+k]||0) - dt;
  if (c['t'+k]<=0){
    c['t'+k] += st.tick;
    if (coneCheck(d, bx, by, st.half*Math.PI/180, st.range)!==null){
      strike(s.move, st.mult, bx, by, T.x, bodyY(T), {small:true});
      if (!T.dead && st.burn && Math.random()<st.burn) applyBurn();
      if (!T.dead && st.push) launchTarget(d.x*st.push, d.y*st.push, 0.35, st.wallDmg||0.1, 0);
    }
  }
}
function pressBtn(slot){
  const c = P.channel;
  if (CUR.combo && c && !c.combo && (c.slot==='click'||c.slot==='rmb') && c.slot!==slot && c.t<0.8){
    c.combo = true; c.slot = 'rmb'; c.t = 0; P.speedMul = SLOTS.rmb.p.moveMul||1; logMsg('Dragon Breath + Flamethrower!'); return;
  }
  doAction(slot);
}
function steerDash(dt){
  const D = P.dash; let cur = Math.atan2(D.dy,D.dx);
  cur += Math.max(-5*dt, Math.min(5*dt, wrapA(Math.atan2(mouse.y-P.y, mouse.x-P.x)-cur)));
  D.dx = Math.cos(cur); D.dy = Math.sin(cur); P.row = rowFromAngle(D.dx, D.dy);
}
function fireLaser(ang, s){
  const ox = P.x, oy = bodyY(P)-2, c = Math.cos(ang), sn = Math.sin(ang);
  effects.push({type:'laser', x:ox, y:oy, ang, age:0, dur:0.2}); shakeT = 0.1; shakeMag = 1;
  if (!T.dead){ const rx = T.x-ox, ry = bodyY(T)-oy, along = rx*c+ry*sn, perp = Math.abs(rx*sn-ry*c); if (along>0 && perp<=7) strike(s.move, s.p.mult, ox, oy, T.x, bodyY(T), {}); }
}
function drawLaser(e){
  const u=e.age/e.dur, c=Math.cos(e.ang), s=Math.sin(e.ang),
    len=Number.isFinite(e.len)?e.len:clipLen(e.x,e.y,c,s,500),
    col=e.col==='water'?PAL.water:(e.col==='electric'?PAL.electric:PAL.water);
  // Shared caster/remote renderer: broad, layered water beam rather than thin pixel "laser".
  // The exact same effect snapshot is drawn on every client, so there is no duplicate overlay.
  if(e.col==='water'){
    ctx.save(); ctx.lineCap='round'; ctx.globalAlpha=Math.max(0.35,1-u);
    const beam=()=>{ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+c*len,e.y+s*len);ctx.stroke();};
    ctx.strokeStyle=col.dark;ctx.lineWidth=18;beam();
    ctx.strokeStyle=col.main;ctx.lineWidth=12;beam();
    ctx.strokeStyle=col.pale;ctx.lineWidth=6;beam();
    ctx.strokeStyle='#ffffff';ctx.lineWidth=2;beam();
    ctx.restore(); return;
  }
  const w=Math.max(1,Math.round(3*(1-u)));
  pline(e.x,e.y,e.x+c*len,e.y+s*len,w+2,col.dark);
  pline(e.x,e.y,e.x+c*len,e.y+s*len,w,col.main);
  pline(e.x,e.y,e.x+c*len,e.y+s*len,1,'#ffffff');
}
function drawLaserCharge(){
  const c = P.channel; if (!c || c.kind!=='laser') return;
  const u = Math.min(1, c.t/0.5), ox = P.x, oy = bodyY(P)-2, dx = Math.cos(c.ang), dy = Math.sin(c.ang);
  for (let i=12;i<clipLen(ox,oy,dx,dy,500);i+=7){ if (Math.floor(i/7+c.t*20)%2) continue; ctx.fillStyle = PAL.water.pale; ctx.fillRect(Math.round(ox+dx*i), Math.round(oy+dy*i), 1, 1); }
  disc(ox+dx*10, oy+dy*8, 1+Math.round(u*4), PAL.water.dark); disc(ox+dx*10, oy+dy*8, Math.round(u*3)+1, PAL.water.pale);
}
function landSlam(j){
  P.locked = false; P.pending = null; P.curSlot = null; setAnimOn(P,'Idle',false); P.once = false;
  effects.push({type:'liq', x:P.x, y:P.y, age:0, dur:2.2, delay:0, q:j.q, move:j.move, fired:false});
}
function hurtPlayer(raw){
  if (P.hidden) return;
  const dmg = Math.max(1, Math.round(raw*(P.buffs.iron?0.5:1)/stageMult(P.stages.def)));
  P.hp = Math.max(0, P.hp-dmg); pop(P.x, P.y-(P.body+23), '-'+dmg, '#ff6a5a', true); shakeT = 0.12; shakeMag = 1;
  if (P.hp<=0){ logMsg('You fainted. Fight reset.'); resetFight(); }
}
function updateAI(dt){
  updateFlying(dt);
  if (P.comboT>0) P.comboT -= dt;
  if (T.wind && !T.dead){
    const w=T.wind;
    if(window.PMD_MP && window.PMD_MP.active && window.PMD_MP.peerPresent){
      // The target owner simulates the push and wall collisions; only expire the mirror timer here.
      w.t-=dt; if(w.t<=0) T.wind=null;
    } else {
      const nx=T.x+w.vx*dt, ny=T.y+w.vy*dt;
      const cx=Math.max(24,Math.min(world.w-24,nx)), cy=Math.max(40,Math.min(world.h-14,ny)); T.x=cx; T.y=cy; w.t-=dt;
      if(cx!==nx || cy!==ny){ if(!w.wallHit){w.wallHit=true;const impact=Math.max(0.10,Number(w.wallDmg)||0.20);T.hp=Math.max(0,T.hp-Math.max(1,Math.round(T.maxhp*impact)));pop(T.x,T.y-34,'Wall impact','#ffb15a',true);effects.push({type:'ring2',x:T.x,y:bodyY(T),age:0,dur:.5,col:'wind'});if(T.hp<=0)killIfDead();} w.t=0; }
      if (w.t<=0) T.wind = null;
    }
  }
  if (T.root>0){ T.root -= dt; T.kx = T.ky = 0; return; }
  if (T.stag>0){ T.stag -= dt; T.kx = T.ky = 0; T.hurtT = Math.max(T.hurtT, 0.1); setAnimOn(T,'Hurt',false); return; }
  if (!$('ai') || !$('ai').checked || T.dead || T.sleep || T.slide || T.grabbed) return;
  const dx = P.x-T.x, dy = P.y-T.y, L = Math.hypot(dx,dy)||1; T.aiCd = (T.aiCd||0) - dt;
  if (T.lunge){
    const l = T.lunge; T.x += l.vx*dt; T.y += l.vy*dt; l.t -= dt;
    if (!l.hit && L<20){ l.hit = true; const base = Math.floor(Math.floor((2*LEVEL/5+2)*40*T.stats.atk/P.stats.def)/50)+2; effects.push({type:'hit', x:P.x, y:bodyY(P), age:0, dur:5*4*TICK, pal:PAL.normal, s:0.8}); hurtPlayer(base*typeMult('normal',P.types)*rnd(0.85,1)); }
    if (l.t<=0) T.lunge = null; return;
  }
  if (L>26){ const sp = (32+T.stats.spe*0.4)*(T.slow?0.5:1); T.x += dx/L*sp*dt; T.y += dy/L*sp*dt; }
  if (L<52 && T.aiCd<=0){ T.aiCd = 1.6; T.lunge = {vx:dx/L*210, vy:dy/L*210, t:0.22, hit:false}; }
}

// ---- Pidgey: Gust wind lane + Twister tornadoes ----
RAMPS.wind = ['#ffffff','#e6f6f0','#c4e4dc','#9cc8c8','#6a98a8'];
const twisters = []; let lane = null;
let hurricane = null;
function gustCast(d){
  const tx = d.x>0.001 ? (world.w-24-P.x)/d.x : d.x<-0.001 ? (24-P.x)/d.x : 1e9, ty = d.y>0.001 ? (world.h-14-P.y)/d.y : d.y<-0.001 ? (40-P.y)/d.y : 1e9;
  lane = {x:P.x, y:P.y, dx:d.x, dy:d.y, len:Math.max(90, Math.min(tx,ty)+70), hw:24, t:4.5, age:0};
  // The lane is a visual cone; the actual push is a directional forced-movement event.
  // This lets the owning client move itself and apply wall-impact damage authoritatively.
  T.wind = {vx:d.x*600, vy:d.y*600, t:1.35, wallDmg:0.28};
  for(let i=0;i<24;i++) parts.push({x:P.x+d.x*10+rnd(-8,8),y:P.y+d.y*10+rnd(-8,8),vx:d.x*rnd(130,280)-d.y*rnd(-55,55),vy:d.y*rnd(130,280)+d.x*rnd(-55,55),age:0,life:rnd(.35,.7),pal:'wind'});
}
function twisterCast(d){
  for (let i=0;i<2;i++) twisters.push({side:i?1:-1, x:P.x, y:P.y+(i?12:-22), state:'orbit', wait:0.35+i*1.0, age:0, hit:false, vx:0, vy:0});
}
function inLane(e){ const rx = e.x-lane.x, ry = e.y-lane.y, along = rx*lane.dx+ry*lane.dy, perp = Math.abs(rx*lane.dy-ry*lane.dx); return along>=0 && along<=lane.len && perp<=lane.hw; }
function updateFlying(dt){
  if(P.quiverT>0){P.quiverT-=dt;if(P.quiverT<=0){P.stages.spa=Math.max(-6,P.stages.spa-1);P.stages.spd=Math.max(-6,P.stages.spd-1);P.stages.spe=Math.max(-6,P.stages.spe-1);P.quiverT=0;}}
  for (let i=fxs.length-1;i>=0;i--){ fxs[i].age += dt; if (fxs[i].age>=fxs[i].dur) fxs.splice(i,1); }
  if (combo.t>0){ combo.t -= dt; if (combo.t<=0) combo.n = 0; } if (combo.pulse>0) combo.pulse -= dt;
  if (wing.t>0) wing.t -= dt;
  if (CUR!==DEX.pidgey){ twisters.length = 0; lane = null; }
  if (P.airT>0) P.airT -= dt;
  if (CUR!==DEX.pidgeot && hurricane) hurricane = null;
  if (CUR===DEX.pidgeot) updatePidgeot(dt);
  if (CUR===DEX.spearow || CUR===DEX.fearow || CUR===DEX.beedrill) updateBirdStrikes(dt);
  updateArbokHold(dt);
  if (CUR===DEX.pidgeotto) updateWing(dt); else if (CUR!==DEX.pidgey && CUR!==DEX.pidgeot){ if (P.hidden||P.agi) resetWing(); return; }
  if (T.wallCd>0) T.wallCd -= dt;
  if (lane){
    lane.t -= dt; lane.age += dt;
    if (lane.t<=0) lane = null;
    else {
      if (!T.dead && !T.grabbed && !T.wind && inLane(T)){
        const nx = T.x+lane.dx*300*dt, ny = T.y+lane.dy*300*dt, cx = Math.max(24, Math.min(world.w-24, nx)), cy = Math.max(40, Math.min(world.h-14, ny));
        T.x = cx; T.y = cy; T.hurtT = Math.max(T.hurtT, 0.1); setAnimOn(T,'Hurt',false);
        if ((cx!==nx || cy!==ny) && !(T.wallCd>0)){ T.wallCd = 1; hurtTarget(0.22, 'Wall impact', T.x, bodyY(T), true); }
      }
      if (lane.age>0.3 && !P.dash && inLane(P)){ P.x += lane.dx*320*dt; P.y += lane.dy*320*dt; }
    }
  }
  for (let i=twisters.length-1;i>=0;i--){
    const w = twisters[i]; w.age += dt;
    if (w.state==='orbit'){
      w.x = P.x; w.y = P.y+(w.side>0?12:-22); w.wait -= dt;
      if (w.wait<=0){ const dx = mouse.x-w.x, dy = mouse.y-(w.y-9), L = Math.hypot(dx,dy)||1; w.vx = dx/L*170; w.vy = dy/L*170; w.state = 'fly'; w.life = 1.5; }
    } else {
      w.x += w.vx*dt; w.y += w.vy*dt; w.life -= dt;
      if (!w.hit && !T.dead && Math.hypot(T.x-w.x, bodyY(T)-(w.y-9))<=14){ w.hit = true; strike('twister', 0.9, w.x, w.y-9, T.x, bodyY(T), {}); if (!T.dead) launchTarget(w.vx*0.5, w.vy*0.5, 0.2, 0.05, 0); }
      if (w.life<=0 || w.x<-20 || w.y<-20 || w.x>world.w+20 || w.y>world.h+20) twisters.splice(i,1);
    }
  }
}
function drawLane(){
  const l = lane, fade = Math.min(1, l.t/0.6), grow = Math.min(1, l.age/0.25), len = l.len*grow;
  for (let k=-3;k<=3;k++){
    const o = k*l.hw/3;
    pline(l.x-l.dy*o, l.y-4+l.dx*o, l.x-l.dy*o+l.dx*len, l.y-4+l.dx*o+l.dy*len, k===0?2:1, fade>0.99 ? (k%2?'#9cc8c8':'#e6f6f0') : 'rgba(156,200,200,'+fade+')');
  }
  for (let i=0;i<7;i++){
    const a = ((i/7)*l.len + l.age*160) % l.len; if (a>len) continue;
    const x = l.x+l.dx*a, y = l.y-4+l.dy*a, o = (i%3-1)*l.hw*0.5, px = x-l.dy*o, py = y+l.dx*o;
    ctx.globalAlpha = fade; pline(px-l.dx*5, py-l.dy*5, px+l.dx*3, py+l.dy*3, 1, '#ffffff'); ctx.globalAlpha = 1;
  }
}
function drawFlying(){
  if (lane) drawLane();
  drawFx(); drawCombo();
  const D = '#4a5f78', M = '#9cc8c8', L = '#e6f6f0', W = '#ffffff';
  if (hurricane){
    // Same stepped, windy pixel language as Pidgey's Twister, only much larger.
    const h=hurricane, grow=Math.min(1,h.age/0.25), x=Math.round(h.x), y=Math.round(h.y+12), off=j=>Math.round(Math.sin(h.age*14+j*.8)*(2+j*.25)), hw=j=>Math.round((3+j*.8)*grow);
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(x-18,y+2,36,3);
    ctx.fillStyle=D; for (let j=0;j<22;j++){ const w=hw(j); ctx.fillRect(x+off(j)-w-1,y-j*3-1,w*2+2,5); }
    for (let j=0;j<22;j++){
      const w=hw(j), ox=x+off(j); ctx.fillStyle=(j+Math.floor(h.age*10))%3===0?L:M; ctx.fillRect(ox-w,y-j*3,w*2,2);
      const s=(j*3+Math.floor(h.age*24))%(Math.max(1,w*2)); ctx.fillStyle=W; ctx.fillRect(ox-w+s,y-j*3,2,1);
    }
    for (let k=0;k<10;k++){ const a=h.age*9+k*1.6, ex=x+Math.round(Math.cos(a)*(hw(21)+5)), ey=y-42+Math.round(Math.sin(a)*6); ctx.fillStyle=k%2?W:D; ctx.fillRect(ex,ey,2,1); }
  }
  for (const w of twisters){
    const x = Math.round(w.x), y = Math.round(w.y), off = j => Math.round(Math.sin(w.age*14+j*0.8)*(1+j*0.25)), hw = j => 2+Math.round(j*0.6);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x-5, y+1, 10, 2);
    ctx.fillStyle = D; for (let j=0;j<11;j++){ const h = hw(j); ctx.fillRect(x+off(j)-h-1, y-j*2-1, h*2+2, 4); }
    for (let j=0;j<11;j++){
      const h = hw(j), ox = x+off(j); ctx.fillStyle = (j+Math.floor(w.age*10))%3===0 ? L : M; ctx.fillRect(ox-h, y-j*2, h*2, 2);
      const s = (j*3+Math.floor(w.age*24))%(h*2); ctx.fillStyle = W; ctx.fillRect(ox-h+s, y-j*2, 2, 1);
    }
    for (let k=0;k<4;k++){ const a = w.age*9+k*1.6, ex = x+Math.round(Math.cos(a)*(hw(10)+3)), ey = y-20+Math.round(Math.sin(a)*3); ctx.fillStyle = k%2 ? W : D; ctx.fillRect(ex, ey, 1, 1); }
  }
}

// Shared basic-attack combo meter: any successful LMB move hit extends the 1.3s chain.
const _strikeForBasicCombo = strike;
strike = function(moveKey, mult, fromX, fromY, ex, ey, opts){
  const before = T.hp;
  _strikeForBasicCombo(moveKey, mult, fromX, fromY, ex, ey, opts);
  if (T.hp < before && SLOTS && SLOTS.click && moveKey === SLOTS.click.move && CUR !== DEX.pidgeotto){ combo.n++; combo.t=1.3; combo.pulse=.25; }
};
// ---- Pidgeotto: Wing Attack 5-hit combo, Agility, Whirlwind, combo counter ----
const wing = {idx:0, t:0, slash:null}, combo = {n:0, t:0, pulse:0}, fxs = [];
function comboHit(){ combo.n++; combo.t = 1.3; combo.pulse = 0.25; }
function resetWing(){ wing.idx = 0; wing.t = 0; wing.slash = null; wing.rush = null; P.hidden = false; P.noMove = false; P.agi = 0; P.agiOn = false; P.kb = null; P.brave = null; P.birdDash = null; P.drillRun = null; P.furyT = 0; P.fury = 0; P.arbokT = 0; P.arbokStep = 0; P.arbokHold = null; P.airT = 0; P.airStep = 0; hurricane = null; combo.n = 0; combo.t = 0; fxs.length = 0; }
const clampP = () => { P.x = Math.max(24, Math.min(world.w-24, P.x)); P.y = Math.max(40, Math.min(world.h-14, P.y)); };
function wingCast(d, s){
  if (T.dead){ wing.idx = 0; return; }
  const i = wing.t>0 ? wing.idx : 0, mv = 'wingattack', ang = Math.atan2(d.y,d.x);
  if (i===4){ wing.idx = 0; wing.t = 0; wing.rush = {dx:d.x, dy:d.y, t:0.28}; P.noMove = true; P.dash = null; P.row = rowFromAngle(d.x,d.y); return; }
  // every step must be aimed: the target has to be inside the cone in front of the cursor direction
  if (i===0) fxs.push({type:'wsweep', x:P.x+d.x*16, y:bodyY(P)+d.y*16, ang, age:0, dur:0.25, r:22});
  else if (i===1) fxs.push({type:'wstab', x:P.x+d.x*10, y:bodyY(P)+d.y*10, ang, age:0, dur:0.22});
  else fxs.push({type:'wsweep', x:P.x+d.x*16, y:bodyY(P)+d.y*16, ang, age:0, dur:0.25, r:28});
  if (coneCheck(d, P.x, bodyY(P), 55*Math.PI/180, 40)===null){ wing.idx = 0; wing.t = 0; return; }
  wing.idx = (i+1)%5; wing.t = 1.3;
  const dx = T.x-P.x, dy = T.y-P.y, L = Math.hypot(dx,dy)||1;
  if (i<=1){ strike(mv, 0.4, P.x, bodyY(P), T.x, bodyY(T), {small:true}); comboHit(); }
  else if (i===2){
    const nx = T.x+dx/L*24, ny = T.y+dy/L*24; fxs.push({type:'blink', x0:P.x, y0:P.y, x1:nx, y1:ny, age:0, dur:0.3});
    P.x = nx; P.y = ny; clampP(); P.row = rowFromAngle(-dx,-dy);
    strike(mv, 0.5, P.x, bodyY(P), T.x, bodyY(T), {small:true}); comboHit();
  } else if (i===3){
    strike(mv, 0.5, P.x, bodyY(P), T.x, bodyY(T), {}); comboHit(); if (!T.dead) launchTarget(dx/L*220, dy/L*220, 0.25, 0.06, 0);
  }
}
function startSlash(){
  const dx = T.x-P.x, dy = T.y-P.y, L = Math.hypot(dx,dy)||1;
  wing.slash = {t:0, n:0, total:8, iv:0.09, dx:dx/L, dy:dy/L}; P.hidden = true; P.noMove = true; P.dash = null;
  T.stag = 8*0.09+0.3; T.slide = null; fxs.push({type:'blink', x0:P.x, y0:P.y, x1:T.x, y1:T.y, age:0, dur:0.25});
}
function updateWing(dt){
  if (P.agi>0){ P.agi -= dt; if (P.agi<=0 && P.agiOn){ P.stages.spe = Math.max(-6, P.stages.spe-2); P.agiOn = false; } }
  if (P.kb){ P.x += P.kb.vx*dt; P.y += P.kb.vy*dt; P.kb.t -= dt; if (P.kb.t<=0) P.kb = null; }
  const r = wing.rush;
  if (r){
    const ox = P.x, oy = P.y; P.x += r.dx*460*dt; P.y += r.dy*460*dt; clampP(); r.t -= dt;
    fxs.push({type:'blink', x0:ox, y0:oy, x1:P.x, y1:P.y, age:0, dur:0.18});
    if (!T.dead && Math.hypot(T.x-P.x, T.y-P.y)<=22){ wing.rush = null; startSlash(); }
    else if (r.t<=0){ wing.rush = null; P.noMove = false; }
    return;
  }
  const w = wing.slash; if (!w) return;
  if (T.dead){ P.hidden = false; P.noMove = false; wing.slash = null; return; }
  w.t += dt;
  while (w.n<w.total && w.t>=w.n*w.iv){
    const a = rnd(0, Math.PI*2), cx = T.x, cy = bodyY(T); fxs.push({type:'vslash', x:cx+rnd(-6,6), y:cy+rnd(-6,6), ang:a, age:0, dur:0.28, len:rnd(32,48)});
    strike('wingattack', 0.06, cx, cy, T.x, bodyY(T), {small:true}); comboHit(); shakeT = 0.05; shakeMag = 1; w.n++;
  }
  if (w.n>=w.total && w.t>=w.total*w.iv+0.12){
    wing.slash = null; P.hidden = false; P.noMove = false; wing.idx = 0;
    P.x = T.x-w.dx*26; P.y = T.y-w.dy*26; clampP(); P.row = rowFromAngle(w.dx, w.dy);
    fxs.push({type:'blink', x0:T.x, y0:T.y, x1:P.x, y1:P.y, age:0, dur:0.25});
    strike('wingattack', 0.6, P.x, bodyY(P), T.x, bodyY(T), {}); comboHit(); shakeT = 0.2; shakeMag = 3;
    if (!T.dead) launchTarget(w.dx*260, w.dy*260, 0.3, 0.1, 0);
    P.kb = {vx:-w.dx*210, vy:-w.dy*210, t:0.28}; cd.click = NOCD ? 0 : 0.3;
  }
}
function agilityCast(){
  if (!P.agiOn){ addStages(P, {spe:2}); P.agiOn = true; }
  P.agi = CUR===DEX.fearow ? 7 : 8; for (let i=0;i<6;i++) effects.push({type:'sparkle', x:P.x+rnd(-14,14), y:P.y-rnd(0,22), age:-rnd(0,0.2), dur:0.6, col:'steel'});
}
function furyCast(d){
  const n=P.furyT>0?(P.fury||0):0;
  const dx=T.x-P.x, dy=T.y-P.y, L=Math.hypot(dx,dy)||1;
  const hitDist=coneCheck(d,P.x,bodyY(P),58*Math.PI/180,42);
  if (n===2 || n===4){
    // Blink steps are only unlocked by the immediately preceding landed attacks.
    if (P.furyHitGate !== n || T.dead || hitDist===null){ P.furyT=0; P.fury=0; P.furyHitGate=0; return; }
    const x=T.x+dx/L*22, y=T.y+dy/L*22; fxs.push({type:'blink',x0:P.x,y0:P.y,x1:x,y1:y,age:0,dur:0.2}); P.x=x; P.y=y; clampP(); P.fury=(n+1)%6; P.furyT=1.3; P.row=rowFromAngle(-dx,-dy); P.furyHitGate=0; return;
  }
  effects.push({type:'melee',fx:'bite',x:P.x+d.x*20,y:bodyY(P)+d.y*20,ang:Math.atan2(d.y,d.x),age:0,dur:0.22});
  if (hitDist===null){P.furyT=0;P.fury=0;P.furyHitGate=0;return;}
  const hpBefore=T.hp;
  strike('furyattack',n===5?0.75:0.42,P.x,bodyY(P),T.x,bodyY(T),{small:n!==5});
  const landed=T.hp<hpBefore;
  if(!landed){P.furyT=0;P.fury=0;P.furyHitGate=0;return;}
  P.fury=(n+1)%6; P.furyT=1.3; P.furyHitGate=(n===1?2:n===3?4:0);
  if(n===5&&!T.dead)launchTarget(d.x*330,d.y*330,0.35,0.12,0);
  if(n===5)cd.click=NOCD?0:0.3;
}
function aerialCast(d){ const v=d||aimDir(P.x,bodyY(P)); P.birdDash={t:CUR===DEX.fearow?5:0.7,hit:false,dx:v.x,dy:v.y,steer:CUR===DEX.fearow}; P.noMove=true; P.locked=true; }
function drillRunCast(d){ if(CUR===DEX.beedrill){P.drillRun={dx:d.x,dy:d.y,t:0.5,phase:'charge',hit:false};}else if(CUR===DEX.fearow){P.drillRun={dx:d.x,dy:d.y,t:5,phase:'fearowDash',hit:false};}else{P.drillRun={dx:d.x,dy:d.y,t:5,hit:false};} P.noMove=true; P.locked=true; P.row=rowFromAngle(d.x,d.y); }
function updateBirdStrikes(dt){
  if (P.agi>0){ P.agi-=dt; if(P.agi<=0&&P.agiOn){ P.stages.spe=Math.max(-6,P.stages.spe-2); P.agiOn=false; } }
  if (P.furyT>0) P.furyT-=dt;
  const a=P.birdDash;
  if (a){ let d={x:a.dx||1,y:a.dy||0}; if(a.steer){const aim=aimDir(P.x,bodyY(P)),ang=Math.atan2(d.y,d.x),tar=Math.atan2(aim.y,aim.x);let df=tar-ang;while(df>Math.PI)df-=Math.PI*2;while(df<-Math.PI)df+=Math.PI*2;const na=ang+Math.max(-4*dt,Math.min(4*dt,df));d={x:Math.cos(na),y:Math.sin(na)};a.dx=d.x;a.dy=d.y;} else {const dx=T.x-P.x,dy=T.y-P.y,L=Math.hypot(dx,dy)||1;d={x:dx/L,y:dy/L};} P.x+=d.x*400*dt;P.y+=d.y*400*dt;clampP();P.row=rowFromAngle(d.x,d.y);if(!a.hit&&!T.dead&&Math.hypot(T.x-P.x,T.y-P.y)<23){a.hit=true;strike('aerialace',1.0,P.x,bodyY(P),T.x,bodyY(T),{});if(!T.dead){launchTarget(d.x*520,d.y*520,0.48,0.18,0);if(T.slide)T.slide.bounce=1;}}a.t-=dt;if(a.t<=0||a.hit){P.birdDash=null;P.noMove=false;P.locked=false;}}
  const r=P.drillRun;
  if(r&&CUR===DEX.beedrill){
    if(r.phase==='charge'){
      r.t-=dt;
      for(let i=0;i<5;i++){
        const a=performance.now()/180+i*Math.PI*2/5, rad=7+(0.5-r.t)*24;
        parts.push({x:P.x+Math.cos(a)*rad+rnd(-2,2),y:bodyY(P)+Math.sin(a)*rad*.7+rnd(-2,2),vx:Math.cos(a)*-18,vy:Math.sin(a)*-18,age:0,life:.22,pal:'steel'});
      }
      effects.push({type:'sparkle',x:P.x+rnd(-10,10),y:bodyY(P)+rnd(-8,8),age:0,dur:.22,col:'steel'});
      if(r.t<=0){r.phase='dash';r.t=5;const d=aimDir(P.x,bodyY(P));r.dx=d.x;r.dy=d.y;}
    }
    else if(r.phase==='dash'){
      const aim=aimDir(P.x,bodyY(P)),ang=Math.atan2(r.dy,r.dx),tar=Math.atan2(aim.y,aim.x);let df=tar-ang;while(df>Math.PI)df-=Math.PI*2;while(df<-Math.PI)df+=Math.PI*2;
      const na=ang+Math.max(-5.2*dt,Math.min(5.2*dt,df));r.dx=Math.cos(na);r.dy=Math.sin(na);P.x+=r.dx*430*dt;P.y+=r.dy*430*dt;clampP();P.row=rowFromAngle(r.dx,r.dy);
      if(Math.random()<0.65)parts.push({x:P.x-r.dx*10+rnd(-3,3),y:bodyY(P)-r.dy*4+rnd(-3,3),vx:-r.dx*30,vy:-r.dy*20,age:0,life:.2,pal:'steel'});
      if(!T.dead&&Math.hypot(T.x-P.x,T.y-P.y)<24){r.phase='grab';r.t=1.4;r.hitT=0;r.hits=0;T.grabbed=true;T.slide=null;}
    }
    else if(r.phase==='grab'){const d=aimDir(P.x,bodyY(P));r.dx=d.x;r.dy=d.y;T.x=P.x+r.dx*18;T.y=P.y+r.dy*10;T.kx=T.ky=0;r.hitT-=dt;if(r.hitT<=0&&r.hits<5){r.hitT=.22;r.hits++;effects.push({type:'melee',fx:'drill',x:T.x,y:bodyY(T),ang:Math.atan2(r.dy,r.dx),age:0,dur:.2});strike('drillrun',.22,P.x,bodyY(P),T.x,bodyY(T),{small:true});}if(r.hits>=5||r.t<=0){T.grabbed=false;launchTarget(r.dx*520,r.dy*520,.5,.2,.05);P.drillRun=null;P.noMove=false;P.locked=false;}}
    if(r&&r.phase!=='grab'&&r.phase!=='charge')r.t-=dt;if(r&&r.phase==='dash'&&r.t<=0){P.drillRun=null;P.noMove=false;P.locked=false;}
  } else if(r&&CUR===DEX.fearow){
    if(r.phase==='fearowDash'){const aim=aimDir(P.x,bodyY(P)),ang=Math.atan2(r.dy,r.dx),tar=Math.atan2(aim.y,aim.x);let df=tar-ang;while(df>Math.PI)df-=Math.PI*2;while(df<-Math.PI)df+=Math.PI*2;const na=ang+Math.max(-3.5*dt,Math.min(3.5*dt,df));r.dx=Math.cos(na);r.dy=Math.sin(na);P.x+=r.dx*390*dt;P.y+=r.dy*390*dt;clampP();P.row=rowFromAngle(r.dx,r.dy);if(!T.dead&&Math.hypot(T.x-P.x,T.y-P.y)<24){r.phase='fearowGrab';r.t=2;r.hitT=0;r.hits=0;T.grabbed=true;T.slide=null;}}
    else if(r.phase==='fearowGrab'){const d=aimDir(P.x,bodyY(P));r.dx=d.x;r.dy=d.y;T.x=P.x+r.dx*18;T.y=P.y+r.dy*10;T.kx=T.ky=0;r.hitT-=dt;if(r.hitT<=0&&r.hits<7){r.hitT=.14;r.hits++;effects.push({type:'melee',fx:'slash',x:T.x,y:bodyY(T),ang:Math.atan2(r.dy,r.dx)+(r.hits%2?.5:-.5),age:0,dur:.18,col:'steel'});strike('drillrun',.14,P.x,bodyY(P),T.x,bodyY(T),{small:true});}if(r.hits>=7){T.grabbed=false;launchTarget(r.dx*560,r.dy*560,.55,.2,.05);P.drillRun=null;P.noMove=false;P.locked=false;}}
    if(r&&r.phase==='fearowDash'){r.t-=dt;if(r.t<=0){P.drillRun=null;P.noMove=false;P.locked=false;}}
  } else if(r){P.x+=r.dx*340*dt;P.y+=r.dy*340*dt;clampP();if(!r.hit&&!T.dead&&Math.hypot(T.x-P.x,T.y-P.y)<24){r.hit=true;strike('drillrun',0.9,P.x,bodyY(P),T.x,bodyY(T),{});if(!T.dead)launchTarget(-r.dy*380+r.dx*90,r.dx*380+r.dy*90,.38,.14,0);}r.t-=dt;if(r.t<=0||r.hit){P.drillRun=null;P.noMove=false;P.locked=false;}}
}
function drillPeckTick(c,s,dt){
  c.hitT=(c.hitT||0)-dt; c.hits=c.hits||0; const d=aimDir(P.x,bodyY(P)); P.row=rowFromAngle(d.x,d.y);
  if(c.hitT<=0){ c.hitT=0.16; effects.push({type:'melee',fx:'bite',x:P.x+d.x*20,y:bodyY(P)+d.y*20,ang:Math.atan2(d.y,d.x)+c.t*14,age:0,dur:0.2}); if(coneCheck(d,P.x,bodyY(P),65*Math.PI/180,38)!==null){ c.hits++; strike('drillpeck',0.22,P.x,bodyY(P),T.x,bodyY(T),{small:true}); if(c.hits>=10&&!T.dead){ launchTarget(d.x*620,d.y*620,0.5,0.2,0); c.hits=0; } } }
}
function brutalSwing(d, move){
  effects.push({type:'melee',fx:'tail',x:P.x+d.x*25,y:bodyY(P)+d.y*25,ang:Math.atan2(d.y,d.x),age:0,dur:0.36});
  if(coneCheck(d,P.x,bodyY(P),82*Math.PI/180,54)!==null){ strike(move,0.9,P.x,bodyY(P),T.x,bodyY(T),{}); if(!T.dead) launchTarget(d.x*360,d.y*360,0.36,0.14,0); }
}
function arbokSwing(d){
  const n=P.arbokT>0?(P.arbokStep||0):0;
  effects.push({type:'melee',fx:'poison',x:P.x+d.x*25,y:bodyY(P)+d.y*25,ang:Math.atan2(d.y,d.x)+(n%2?0.55:-0.55),age:0,dur:0.3});
  if(coneCheck(d,P.x,bodyY(P),78*Math.PI/180,54)===null){P.arbokStep=0;P.arbokT=0;return;}
  const before=T.hp;
  strike('brutalswing',n===2?0.7:0.38,P.x,bodyY(P),T.x,bodyY(T),{small:n!==2});
  if(T.hp>=before){P.arbokStep=0;P.arbokT=0;return;} // only three successful swings can earn the grab
  P.arbokStep=(n+1)%3; P.arbokT=1.3;
  if(n===2&&!T.dead){ T.grabbed=true; T.slide=null; P.arbokHold={t:2,dx:d.x,dy:d.y}; cd.click=NOCD?0:0.5; }
}
function updateArbokHold(dt){
  if(P.arbokT>0) P.arbokT-=dt;
  const h=P.arbokHold; if(!h) return;
  if(T.dead){ P.arbokHold=null; return; }
  h.t-=dt; const f=aimDir(P.x,bodyY(P)); h.dx=f.x; h.dy=f.y; T.x=P.x+h.dx*19; T.y=P.y+h.dy*10; T.kx=T.ky=0; T.hurtT=Math.max(T.hurtT,0.1);
  h.fxT=(h.fxT||0)-dt; if(h.fxT<=0){h.fxT=.16;effects.push({type:'melee',fx:'poison',x:T.x,y:bodyY(T),ang:Math.atan2(h.dy,h.dx)+Math.sin(performance.now()/90)*.65,age:0,dur:.2});}
  if(h.t<=0){ T.grabbed=false; launchTarget(h.dx*420,h.dy*420,0.38,0.14,0); P.arbokHold=null; }
}
function poisonBite(d){
  effects.push({type:'melee',fx:'poison',x:P.x+d.x*20,y:bodyY(P)+d.y*20,ang:Math.atan2(d.y,d.x),age:0,dur:0.30});
  if(coneCheck(d,P.x,bodyY(P),55*Math.PI/180,34)!==null){ strike('poisonjab',0.7,P.x,bodyY(P),T.x,bodyY(T),{}); if(!T.dead&&Math.random()<0.35) applyPoison(false); }
}
function glareCast(d){
  aimCone('sleep',()=>{ if(T.dead) return; T.stag=2; pop(T.x,T.y-34,'Stunned!','#ecec86',false); },d,P.x,bodyY(P));
}
function suckerCast(c, s){
  const d=aimDir(P.x,bodyY(P)), charge=Math.min(1,c.t/(s.maxHold||10)), mult=0.38+charge*1.05;
  P.x=Math.max(24,Math.min(world.w-24,P.x+d.x*10)); P.y=Math.max(40,Math.min(world.h-14,P.y+d.y*7));
  effects.push({type:'melee',fx:'bite',x:P.x+d.x*22,y:bodyY(P)+d.y*22,ang:Math.atan2(d.y,d.x),age:0,dur:0.3});
  if (coneCheck(d,P.x,bodyY(P),58*Math.PI/180,46)!==null){ strike('suckerpunch',mult,P.x,bodyY(P),T.x,bodyY(T),{small:charge<0.55}); if (!T.dead && charge>0.7) launchTarget(d.x*(160+charge*170),d.y*(160+charge*170),0.25,0.08,0); }
}
function superFangCast(d){
  P.x=Math.max(24,Math.min(world.w-24,P.x+d.x*12)); P.y=Math.max(40,Math.min(world.h-14,P.y+d.y*8));
  effects.push({type:'melee',fx:'bite',x:P.x+d.x*24,y:bodyY(P)+d.y*24,ang:Math.atan2(d.y,d.x),age:0,dur:0.32});
  if (T.dead || coneCheck(d,P.x,bodyY(P),48*Math.PI/180,42)===null) return;
  if (typeMult('normal',T.types)===0){ pop(T.x,T.y-34,'Immune!','#c8c8c8',false); return; }
  const dmg=Math.max(1,Math.ceil(T.hp/2)); T.hp-=dmg; T.flashT=0.09; T.hurtT=0.26; setAnimOn(T,'Hurt',false);
  effects.push({type:'hit',x:T.x,y:bodyY(T),age:0,dur:5*4*TICK,pal:PAL.normal,s:1}); pop(T.x,T.y-34,dmg,'#ffe27a',true); logMsg('Super Fang: halved the opponent’s current HP · '+dmg+' dmg'); shakeT=0.16; shakeMag=2; killIfDead();
}
function laserFocusCast(){
  P.laserFocus=true; timers.push({t:300,fn:()=>{P.laserFocus=false;}}); pop(P.x,P.y-(P.body+26),'Crit ready!','#ffe27a',false);
  effects.push({type:'ring2',x:P.x,y:bodyY(P)-4,age:0,dur:0.85,col:'steel'});
  for (let i=0;i<14;i++) effects.push({type:'sparkle',x:P.x+rnd(-18,18),y:bodyY(P)+rnd(-14,10),age:-rnd(0,0.2),dur:0.75,col:'steel'});
}
function updateHurricane(c, s, dt){
  if (!hurricane) hurricane = {x:P.x,y:bodyY(P)-3,age:0,tick:0,ang:0,throwVX:0,throwVY:0};
  const h = hurricane; h.x=P.x; h.y=bodyY(P)-3; h.age += dt; h.tick -= dt; h.ang += dt*(3.2 + Math.min(8.5, h.age*1.25)); h.netTick=(h.netTick||0)-dt;
  if(h.netTick<=0){h.netTick=.10;if(window.PMD_MP&&window.PMD_MP.active)window.PMD_MP.eventAll({kind:'hurricaneField',active:true,x:h.x,y:h.y,ang:h.ang,duration:.24});}
  if (!T.dead){
    const rx=T.x-h.x, ry=bodyY(T)-h.y, L=Math.hypot(rx,ry)||1;
    if (L<620){
      // Pull toward a wide orbit, not into the center, then rotate around the tornado.
      const targetR=118, radial=Math.max(-240,Math.min(300,(targetR-L)*2.8));
      const orbitSpeed=205 + Math.min(360,h.age*42);
      const tx=-ry/L*orbitSpeed, ty=rx/L*orbitSpeed;
      if(!(window.PMD_MP&&window.PMD_MP.active)){
        T.x += (rx/L*radial+tx)*dt; T.y += (ry/L*radial+ty)*dt;
        T.x=Math.max(24,Math.min(world.w-24,T.x)); T.y=Math.max(40,Math.min(world.h-14,T.y));
        T.root=Math.max(T.root||0,0.08);
      }
      T.hurtT=Math.max(T.hurtT,0.1);
      h.throwVX=rx/L*370+tx*0.72; h.throwVY=ry/L*370+ty*0.72;
    }
    if (L<34 && h.tick<=0){ h.tick=0.62; strike('hurricane',0.07,h.x,h.y,T.x,bodyY(T),{small:true}); }
  }
  for (const p of projs){
    if (!p.hurricane && Math.hypot(p.x-h.x,p.y-h.y)<620){
      p.hurricane=true;
      p.hAngle=Math.atan2(p.y-h.y,p.x-h.x);
      p.hRing=Math.max(82,Math.min(210,Math.hypot(p.x-h.x,p.y-h.y)));
      p.hBaseRing=p.hRing;
      p.hOrbitAge=0;
      p.hInertiaVX=Number(p.vx)||0; p.hInertiaVY=Number(p.vy)||0;
    }
  }
}
function hurricaneRelease(){
  const h=hurricane;
  if(h&&window.PMD_MP&&window.PMD_MP.active)window.PMD_MP.eventAll({kind:'hurricaneField',active:false,release:true,x:h.x,y:h.y,ang:h.ang,duration:.75});
  if (!h) return;
  // Throw every projectile caught in the wind outward with a tangential kick.
  for (const p of projs){
    if(!p.hurricane) continue;
    const dx=p.x-h.x, dy=p.y-h.y, L=Math.hypot(dx,dy)||1, tx=-dy/L, ty=dx/L;
    const orbitSpeed=3.2+Math.min(8.5,(h.age||0)*1.25), tangent=orbitSpeed*Math.max(60,Number(p.hRing)||100);
    const ivx=Number(p.hInertiaVX)||0, ivy=Number(p.hInertiaVY)||0;
    p.hurricane=false;
    p.vx=dx/L*300+tx*tangent*0.62+ivx*0.25;
    p.vy=dy/L*300+ty*tangent*0.62+ivy*0.25;
    p.life=Math.max(0.85,Number(p.life)||0.85); p.age=0; p.releasedByHurricane=true;
  }
  const dx=T.x-h.x, dy=bodyY(T)-h.y, L=Math.hypot(dx,dy)||1;
  if(!T.dead && L<620){
    T.root=0;
    const tx=-dy/L, ty=dx/L;
    if(!(window.PMD_MP&&window.PMD_MP.active)){
      launchTarget((dx/L*430+tx*190),(dy/L*430+ty*190),0.9,0.18,0.03);
      if(T.slide)T.slide.bounce=2;
    }
  }
  effects.push({type:'whirl',x:h.x,y:h.y+8,age:0,dur:0.7});
  shakeT=0.18; shakeMag=2;
}
function braveCast(d){
  if (P.brave) return;
  P.brave = {phase:'windup',t:0.34,dx:d.x,dy:d.y,hit:false}; P.noMove=true; P.locked=true; P.row=rowFromAngle(d.x,d.y);
  for (let i=0;i<14;i++) effects.push({type:'flamelet',x:P.x+rnd(-12,12),y:bodyY(P)+rnd(-8,10),age:-rnd(0,0.2),dur:0.45});
}
function updatePidgeot(dt){
  if (P.agi>0){ P.agi-=dt; if (P.agi<=0 && P.agiOn){ P.stages.spe=Math.max(-6,P.stages.spe-2); P.agiOn=false; } }
  if (P.kb){
    P.x += P.kb.vx*dt; P.y += P.kb.vy*dt; P.kb.t -= dt;
    if (P.x<=24 || P.x>=world.w-24 || P.y<=40 || P.y>=world.h-14){ P.kb.vx *= -0.48; P.kb.vy *= -0.48; }
    clampP(); if (P.kb.t<=0) P.kb=null;
  }
  const b=P.brave; if (!b) return;
  b.t-=dt;
  if (b.phase==='windup'){
    if (b.t<=0){ b.phase='flight'; b.t=0.85; P.trailT=0; }
    return;
  }
  if (b.phase==='flight' || b.phase==='carry'){
    const ox=P.x, oy=P.y; P.x += b.dx*430*dt; P.y += b.dy*430*dt; clampP(); const wall=P.x!==ox+b.dx*430*dt || P.y!==oy+b.dy*430*dt; P.row=rowFromAngle(b.dx,b.dy);
    for (let i=0;i<3;i++) effects.push({type:'flamelet',x:P.x-b.dx*rnd(8,24)+rnd(-4,4),y:bodyY(P)-b.dy*rnd(4,14)+rnd(-4,4),age:0,dur:0.35});
    if (!b.hit && !T.dead && Math.hypot(T.x-P.x,bodyY(T)-bodyY(P))<22){ b.hit=true; b.phase='carry'; T.grabbed=true; T.root=9; strike('bravebird',0.65,P.x,bodyY(P),T.x,bodyY(T),{}); shakeT=0.2; shakeMag=3; }
    if (b.hit && !T.dead){ T.x=P.x+b.dx*18; T.y=P.y+b.dy*12; T.kx=T.ky=0; }
    if (wall) finishBrave(b.hit);
    else if (!b.hit && b.t<=0) finishBrave(false);
  }
}
function finishBrave(hit){
  const b=P.brave; if (!b) return;
  if (hit && !T.dead){ T.grabbed=false; T.root=0; launchTarget(b.dx*780,b.dy*780,0.58,0.24,0); T.slide.bounce=1; P.kb={vx:-b.dx*560,vy:-b.dy*560,t:0.46}; effects.push({type:'whirl',x:P.x,y:bodyY(P),age:0,dur:0.75}); shakeT=0.35; shakeMag=5; }
  hurtPlayer(P.maxhp*0.12); P.brave=null; P.noMove=false; P.locked=false; P.pending=null; P.curSlot=null; setAnimOn(P,'Idle',false);
}
function whirlCast(){
  fxs.push({type:'whirl', x:P.x, y:P.y-4, age:0, dur:0.6}); shakeT = 0.15; shakeMag = 1;
  const dx = T.x-P.x, dy = T.y-P.y, L = Math.hypot(dx,dy)||1;
  if (!T.dead && L<=140) launchTarget(dx/L*300, dy/L*300, 0.4, 0.12, 0);
}
function drawFx(){
  for (const f of fxs){
    const u = f.age/f.dur;
    if (f.type==='wsweep'){
      const g = Math.min(1,u*2.4); ctx.globalAlpha = Math.max(0,1-u*u); let q = null;
      for (let k=0;k<=14;k++){ if (k/14>g) break; const a = f.ang-1.1+2.2*(k/14), X = f.x+Math.cos(a)*f.r, Y = f.y+Math.sin(a)*f.r*0.9; if (q){ pline(q[0],q[1],X,Y,3,'#6a98a8'); pline(q[0],q[1],X,Y,1,'#ffffff'); } q = [X,Y]; }
      ctx.globalAlpha = 1;
    } else if (f.type==='wstab'){
      const c = Math.cos(f.ang), s = Math.sin(f.ang), g = Math.min(1,u*3), len = 36*g; ctx.globalAlpha = Math.max(0,1-u*u);
      for (const o of [-3,3]){ const px = -s*o, py = c*o; pline(f.x+px, f.y+py, f.x+px+c*len, f.y+py+s*len, 3, '#d89030'); pline(f.x+px, f.y+py, f.x+px+c*len, f.y+py+s*len, 1, '#fff2a8'); }
      disc(f.x+c*len, f.y+s*len, 2, '#ffffff'); ctx.globalAlpha = 1;
    } else if (f.type==='blink'){
      ctx.globalAlpha = 1-u; pline(f.x0, f.y0-8, f.x1, f.y1-8, 3, '#9cc8c8'); pline(f.x0, f.y0-8, f.x1, f.y1-8, 1, '#ffffff'); ctx.globalAlpha = 1;
    } else if (f.type==='vslash'){
      const c = Math.cos(f.ang), s = Math.sin(f.ang), x0 = f.x-c*f.len/2, y0 = f.y-s*f.len/2, g = Math.min(1,u*3.5), x1 = x0+c*f.len*g, y1 = y0+s*f.len*g;
      ctx.globalAlpha = Math.max(0, 1-u*u); pline(x0,y0,x1,y1,3,'#6a98a8'); pline(x0,y0,x1,y1,2,'#e6f6f0'); pline(x0,y0,x1,y1,1,'#ffffff'); disc(x1,y1,2,'#ffffff'); ctx.globalAlpha = 1;
    } else if (f.type==='whirl'){
      const r = u*140; ctx.globalAlpha = Math.max(0, 1-u*u);
      for (let k=0;k<3;k++){ const rr = r*(1-k*0.18); for (let i=0;i<40;i++){ const a = i/40*Math.PI*2+f.age*(8-k*2); if (i%3===0) continue; ctx.fillStyle = (i+k)%2 ? '#ffffff' : '#9cc8c8'; ctx.fillRect(Math.round(f.x+Math.cos(a)*rr), Math.round(f.y+Math.sin(a)*rr*0.7), 2, 1); } }
      ctx.globalAlpha = 1;
    }
  }
}
function drawCombo(){
  if (combo.t<=0 || combo.n<2) return;
  const k = 1+Math.max(0,combo.pulse)*2.4; ctx.save(); ctx.textAlign = 'right'; ctx.lineJoin = 'round';
  ctx.font = 'bold '+Math.round(22*k)+'px monospace'; ctx.lineWidth = 4; ctx.strokeStyle = '#241a5a'; ctx.fillStyle = combo.n>=10 ? '#ff7a3a' : '#ffd23a';
  const txt = combo.n+' HITS', x = world.w-24, y = 62; ctx.strokeText(txt, x, y); ctx.fillText(txt, x, y);
  ctx.font = 'bold 9px monospace'; ctx.lineWidth = 3; ctx.fillStyle = '#ffffff'; ctx.strokeText('COMBO', x, y+11); ctx.fillText('COMBO', x, y+11);
  ctx.restore();
}
