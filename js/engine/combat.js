// ---------------- damage ----------------
function calcDamage(move, mult, crit){
  const phys = move.cat==='physical';
  const atk = (phys ? P.stats.atk : P.stats.spa)*(phys?1:stageMult(P.stages.spa)), def = (phys ? T.stats.def : T.stats.spd)*stageMult(phys?T.stages.def:T.stages.spd);
  const base = Math.floor(Math.floor((2*LEVEL/5+2)*move.power*atk/def)/50)+2;
  const stab = P.types.includes(move.type) ? 1.5 : 1;
  const eff = typeMult(move.type, T.types);
  // In PvP, the mirrored target carries the defending player's active buffs.
  // Iron Defense therefore reduces incoming attack damage just as it reduces
  // self-damage in the original player-side damage helper. Dummy fights are unchanged.
  const guard = T.buffs && T.buffs.iron ? 0.5 : 1;
  const dmg = eff===0 ? 0 : Math.max(1, Math.round(base*stab*eff*guard*rnd(0.85,1)*(crit?1.5:1)*mult));
  return {dmg, eff};
}
function pop(x, y, txt, col, big){ numbers.push({x, y, txt:String(txt), col, big:!!big, age:0}); }
function killIfDead(){
  if (T.hp<=0 && !T.dead){ T.dead = true; T.deadT = 1.8; T.seed = T.psn = T.sleep = T.burn = T.slow = T.slide = null; T.grabbed = false; setAnimOn(T,'Faint',true); }
}
function strike(moveKey, mult, fromX, fromY, ex, ey, o){
  if (T.dead) return;
  o = o || {};
  const m = MOVES[moveKey], forceCrit = !!P.laserFocus, crit = o.crit!==undefined ? !!o.crit : (forceCrit || Math.random() < ([1/24,1/8,1/2,1][Math.min(3,P.critStage||0)])), r = calcDamage(m, mult, crit);
  if (r.eff===0){ pop(T.x, T.y-34, 'Immune!', '#c8c8c8', false); logMsg(m.name+': it doesn\'t affect the dummy.'); return; }
  T.hp = Math.max(0, T.hp - r.dmg);
  if (forceCrit) P.laserFocus = false;
  const dx = T.x-fromX, dy = T.y-fromY, L = Math.hypot(dx,dy)||1, kb = o.small ? 20 : 55;
  T.kx += dx/L*kb; T.ky += dy/L*kb;
  T.flashT = o.small ? 0.05 : 0.09; T.hurtT = o.small ? 0.12 : 0.26; setAnimOn(T,'Hurt',false);
  effects.push({type:'hit', x:ex, y:ey, age:0, dur:5*4*TICK, pal:PAL[m.type], s:o.small?0.55:0.9});
  if (!o.small){ hitstop = Math.max(hitstop, 0.05); shakeT = 0.18; shakeMag = 2; }
  const col = r.eff>1 ? '#ff8a5c' : r.eff<1 ? '#b9bdb5' : '#ffe27a';
  pop(T.x+rnd(-4,4), T.y-34, r.dmg+(crit?'!':''), col, r.eff>1 || crit);
  logMsg(m.name+': '+(r.eff>1?'super effective ('+fmtMult(r.eff)+')':r.eff<1?'not very effective ('+fmtMult(r.eff)+')':'normal damage')+(crit?', critical hit':'')+' · '+r.dmg+' dmg');
  killIfDead();
}
let logT = 0;
function logMsg(s){ $('log').textContent = s; }

// ---------------- actions ----------------
// ---------- statuses, dashes, buffs ----------
function applyBurn(){
  if (T.dead) return;
  if (T.types.includes('fire')){ return; }
  const fresh = !T.burn; T.burn = {t:5, tick:0.5};
  if (fresh){ pop(T.x, T.y-34, 'Burned!', '#ff9a4a', false); }
}
function applySlow(){
  if (T.dead) return;
  const fresh = !T.slow; T.slow = {t:4};
  if (fresh) pop(T.x, T.y-34, 'Slowed!', '#8fdcff', false);
}
function launchTarget(vx, vy, dur, wall, land){ T.slide = {vx, vy, t:dur, wall:wall||0, land:land||0}; T.kx = T.ky = 0; }
function hurtTarget(pct, label, ex, ey, big){
  if (T.dead || pct<=0) return;
  const dmg = Math.max(1, Math.round(T.maxhp*pct));
  T.hp = Math.max(0, T.hp-dmg);
  effects.push({type:'hit', x:ex, y:ey, age:0, dur:5*4*TICK, pal:PAL.normal, s:big?1.1:0.8});
  pop(T.x+rnd(-4,4), T.y-34, dmg, '#ff7a5a', true);
  if (big){ hitstop = Math.max(hitstop, 0.08); shakeT = 0.22; shakeMag = 3; }
  logMsg(label+' · '+dmg+' dmg');
  killIfDead();
}
function onDashContact(D, q){
  const m = MOVES[D.move];
  if (q.multi){
    D.t = 0; strike(D.move, q.mult, P.x, P.y, T.x, bodyY(T), {small:true}); T.root = 0.5; const dx = D.dx, dy = D.dy;
    timers.push({t:0.12, fn:()=>strike(D.move, q.mult, P.x, P.y, T.x, bodyY(T), {small:true})});
    timers.push({t:0.24, fn:()=>strike(D.move, q.mult, P.x, P.y, T.x, bodyY(T), {small:true})});
    timers.push({t:0.36, fn:()=>{ if (T.dead) return; strike(D.move, q.mult, P.x, P.y, T.x, bodyY(T), {}); if (!T.dead) launchTarget(dx*140, dy*140, 0.2, 0.04, 0); }});
    return;
  }
  if (q.grab){
    if (typeMult(m.type, T.types)===0){ pop(T.x, T.y-34, 'Immune!', '#c8c8c8', false); logMsg(m.name+': it doesn\'t affect the dummy.'); return; }
    D.grabbed = true; if (!q.carry) D.t = Math.min(D.t, 0.18); T.grabbed = true; T.slide = null;
    strike(D.move, q.mult, P.x, P.y, T.x, bodyY(T), {});
  } else {
    strike(D.move, q.mult, P.x, P.y, T.x, bodyY(T), {});
    if (T.dead) return;
    if (q.knock) launchTarget(D.dx*q.knock.v, D.dy*q.knock.v, q.knock.dur, q.knock.wall, 0);
    if (q.burn && Math.random()<q.burn) applyBurn();
    if (q.stop) D.t = 0;
  }
}
function updateDashContact(dt){
  const D = P.dash, q = D.contact;
  D.t -= dt;
  if (!D.hit && !T.dead && !D.grabbed && Math.hypot(T.x-P.x, T.y-P.y) < (q.reach||22)){ D.hit = true; onDashContact(D, q); }
  if (D.grabbed && !T.dead){ T.x = P.x + D.dx*20; T.y = P.y + D.dy*12; T.kx = T.ky = 0; T.hurtT = Math.max(T.hurtT, 0.1); setAnimOn(T,'Hurt',false); }
  if (D.t<=0){
    if (D.grabbed){
      T.grabbed = false;
      if (!T.dead){ const th = q.throwSpec, g = th.away ? {x:D.dx,y:D.dy} : aimDir(P.x,P.y); launchTarget(g.x*th.v, g.y*th.v, th.dur, th.wall, th.land); shakeT = 0.12; shakeMag = 2; }
    }
    P.dash = null;
  }
}
function applyBuff(s){
  const q = s.p;
  P.buffs[q.type] = Object.assign({}, q, {t:q.dur, tick0:q.tick, tick:0, fx:0});
  if (q.type==='invis'){ for (let i=0;i<8;i++) effects.push({type:'smoke', x:P.x+rnd(-8,8), y:P.y-rnd(0,16), age:-rnd(0,0.15), dur:0.8}); }
  if (q.type==='aqua'){ effects.push({type:'ring2', x:P.x, y:P.y, age:0, dur:0.5, col:'water'}); }
  if (q.type==='iron'){ for (let i=0;i<6;i++) effects.push({type:'sparkle', x:P.x+rnd(-14,14), y:P.y-rnd(0,24), age:-rnd(0,0.2), dur:0.6, col:'steel'}); }
  if (q.type==='blitz'){ shakeT = 0.1; shakeMag = 1; }
}
function updateBuffs(dt){
  for (const k in P.buffs){
    const b = P.buffs[k]; b.t -= dt; b.tick -= dt; b.fx -= dt;
    if (b.t<=0){ delete P.buffs[k]; continue; }
    if (k==='aqua' && b.tick<=0){ b.tick += 0.5; healSelf(P.maxhp*0.02); }
    // Smoke Screen creates a one-time cast puff only. Do not emit repeated smoke at
    // the invisible player's current position, which looks like a tracking cloud in PvP.
    if (k==='blitz' && b.tick<=0){
      b.tick += b.tick0 || 0.25;
      if (!T.dead && Math.hypot(T.x-P.x, T.y-P.y) < b.radius){
        const hp0 = T.hp; strike('flareblitz', b.mult, P.x, P.y, T.x, bodyY(T), {small:true});
        const dealt = hp0 - T.hp;
        if (dealt>0){ const rec = Math.max(1, Math.round(dealt*b.recoil)); P.hp = Math.max(1, P.hp-rec); pop(P.x+rnd(-4,4), P.y-(P.body+23), '-'+rec, '#ff7a5a', false); }
        if (!T.dead && b.burn && Math.random()<b.burn) applyBurn();
      }
    }
  }
}
function healSelf(amt, quiet){
  amt = Math.max(1, Math.round(amt));
  P.hp = Math.min(P.maxhp, P.hp+amt);
  if (!quiet) pop(P.x+rnd(-4,4), P.y-(P.body+23), '+'+amt, '#7dff8a', false);
}
function doAction(slot){
  const s = SLOTS[slot]; if (!s) return;
  if(P.channel && P.channel.kind==='aquaJetHold' && slot!==P.channel.slot){
    if(cd[slot]>0)return;
    if(slot==='click' && s.kind==='stream' && s.p && s.p.limitedShots){
      if(!P.jetBubble) P.jetBubble={slot:'click',t:0,next:0,shots:0};
      setAnimOn(P,s.anim||'Shoot',false); P.once=false; return;
    }
    if(slot==='Q'||slot==='E') { cd[slot]=NOCD?0:s.cd; fire(s.kind,s); return; }
    if(s.dodge){ endChannel(); return doAction(slot); }
    if(!s.channel && !s.windup){ cd[slot]=NOCD?0:s.cd; fire(s.kind,s); return; }
  }
  if (!s.dodge && (P.locked || P.channel || P.casting || P.noMove)) return;
  if (cd[slot] > 0) return;
  if (s.dodge){ if (P.noCancel || P.jump || (P.dash && P.dash.contact)) return; endChannel(); P.casting = false; }
  const mobile = !!(s.p && s.p.mobile && s.channel), mc = !!s.moveCast;
  P.dash = null; P.locked = !(mobile||mc); P.curSlot = s; P.casting = mc; if (mc) P.speedMul = 0.8;
  const anim = P.A[s.anim] ? s.anim : 'Idle';
  if (s.windup){
    cd[slot] = NOCD?0:s.cd*(P.agi>0?0.6:1);
    P.channel = {slot,kind:'windup',t:0,ang:0}; P.noCancel=true; P.noMove=true; P.locked=true; P.curSlot=s; setAnimOn(P,s.windupAnim||'Charge',false); P.once=false; return;
  }
  if (s.channel){
    P.channel = {slot, kind:s.kind, t:0, next:0, tick:0.25, phase:'charge', ang:0, bt:0, hitT:0, sp:0, shots:0};
    P.noCancel = !!s.noCancel; P.pending = null; setAnimOn(P, anim, false); P.once = false;
    P.channel.mobile = mobile; P.channel.anim = anim; P.speedMul = mobile ? (s.p.moveMul||1) : 1;
    if (s.kind==='synth'){
      healSelf(P.maxhp*0.06);
      effects.push({type:'ring2', x:P.x, y:P.y, age:0, dur:0.5});
      for (let i=0;i<6;i++) effects.push({type:'sparkle', x:P.x+rnd(-16,16), y:P.y-rnd(0,18), age:-rnd(0,0.2), dur:0.6});
    }
    return;
  }
  cd[slot] = NOCD?0:s.cd*(P.agi>0?0.6:1);
  setAnimOn(P, anim, true);
  P.pending = s.kind ? {kind:s.kind, fired:false, frame:s.fireFrame, slot:s} : null;
  if (s.dodge){
    let dx = (keys.KeyD?1:0)-(keys.KeyA?1:0), dy = (keys.KeyS?1:0)-(keys.KeyW?1:0);
    if (!dx && !dy){ dx = mouse.x-P.x; dy = mouse.y-P.y; }
    const L = Math.hypot(dx,dy)||1;
    P.dash = {dx:dx/L, dy:dy/L, speed:s.dashSpeed||130};
    P.row = rowFromAngle(dx,dy); P.trailT = 0;
  }
}
function endChannel(){
  if (!P.channel) return;
  const c = P.channel, s = SLOTS[c.slot];
  if(c.kind==='aquaJetHold' && P.jetBubble){ cd.click=NOCD?0:Math.min(5,Math.max(0.5,P.jetBubble.shots*0.5)); P.jetBubble=null; }
  if (c.kind==='hurricane'){
    hurricaneRelease();
    hurricane = null;
    // hurricaneRelease converts orbiting projectiles into real outward-moving projectiles.
  }
  cd[c.slot] = NOCD?0:(s.p && s.p.limitedShots!=null ? Math.min(5,Math.max(0.5,c.shots*0.5)) : s.cd + Math.max(0, c.t-(s.freeT||0))*(s.cdPerSec ?? 0.5));
  if (c.combo) cd.click = NOCD?0:SLOTS.click.cd;
  P.channel = null; P.noCancel = false; P.locked = false; P.curSlot = null; P.speedMul = 1; setAnimOn(P,'Idle',false); P.once = false;
}
function aimDir(fromX, fromY){
  const dx = mouse.x-fromX, dy = mouse.y-fromY, L = Math.hypot(dx,dy);
  return L<1 ? {x:0,y:1} : {x:dx/L, y:dy/L};
}
function coneCheck(d, bx, by, half, range){
  const tx = T.x-bx, ty = bodyY(T)-by, dist = Math.hypot(tx,ty);
  if (T.dead || dist > range) return null;
  const margin = Math.atan2(8, Math.max(dist,8));
  const cosA = (tx*d.x+ty*d.y)/(dist||1);
  return Math.acos(Math.max(-1,Math.min(1,cosA))) <= half+margin ? dist : null;
}
function aimCone(palKey, applyFn, d, bx, by){
  const ang = Math.atan2(d.y,d.x), half = 30*Math.PI/180;
  for (let i=0;i<46;i++){
    const a = ang + rnd(-half,half), sp = rnd(85,130);
    parts.push({x:bx+d.x*8, y:by+d.y*8, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, age:-rnd(0,0.22), life:rnd(0.45,0.65), pal:palKey});
  }
  const dist = coneCheck(d, bx, by, half, 84);
  if (dist!==null) timers.push({t:dist/120, fn:applyFn});
}
function fire(kind, s){
  const bx = P.x, by = bodyY(P), d = aimDir(bx, by);
  if (kind==='hydroTwin'){
    P.channel={slot:s.label==='LMB'?'click':'rmb',kind:'hydroTwin',t:0,ang:Math.atan2(d.y,d.x),hitT:0}; P.noCancel=false; P.locked=true; P.noMove=true; P.casting=true; return;
  } else if (kind==='vines'){
    // ground aim from the feet, vines land 44 px ahead, 10 px apart
    const g = aimDir(P.x, P.y), px = -g.y, py = g.x, dist = 44;
    const root = {x:P.x, y:P.y-12};
    const v = [-1,1].map((sgn,i)=>({gx:P.x+g.x*dist+px*10*sgn, gy:P.y+g.y*dist+py*10*sgn, rx:root.x+px*3*sgn, ry:root.y+py*3*sgn, delay:i*2, hit:false}));
    effects.push({type:'vines', age:0, dur:40*TICK, dx:g.x, dy:g.y, v});
  } else if (kind==='seed'){
    projs.push({type:'seed', x:bx+d.x*10, y:by+d.y*10, vx:d.x*150, vy:d.y*150, r:4, life:5, age:0});
  } else if (kind==='powder'){
    aimCone('poison', ()=>applyPoison(true), d, bx, by);
  } else if (kind==='sleep'){
    aimCone('sleep', applySleep, d, bx, by);
  } else if (kind==='razorfan'){
    const a0 = Math.atan2(d.y,d.x);
    for (const off of [-0.17,0,0.17]){
      const a = a0+off;
      projs.push({type:'leaf', state:'fly', x:bx+d.x*10, y:by+d.y*10, vx:Math.cos(a)*300, vy:Math.sin(a)*300, r:3, life:5, age:0, move:'razorleaf', mult:0.25, crit:0.125});
    }
  } else if (kind==='magical'){
    const n = 8;
    for (let i=0;i<n;i++){
      const a = i*Math.PI*2/n - Math.PI/2, ox = Math.cos(a)*18, oy = Math.sin(a)*14;
      projs.push({type:'mleaf', state:'hover', ox, oy, x:bx+ox, y:by+oy, ang:a, vx:0, vy:0, r:4, life:2.2, age:0, hover:0.3+i*0.05, col:RAINBOW[i%5], speed:130, homing:'always', move:'magicalleaf', mult:0.18});
    }
    shakeT = 0.15; shakeMag = 1;
  } else if (kind==='mbasic'){
    const a0 = Math.atan2(d.y,d.x);
    [-0.22,0,0.22].forEach((off,i)=>{
      const a = a0+off, x = bx+d.x*10, y = by+d.y*10, tx = T.x-x, ty = bodyY(T)-y;
      let df = Math.atan2(ty,tx)-a; while (df>Math.PI) df -= 2*Math.PI; while (df<-Math.PI) df += 2*Math.PI;
      const lock = !T.dead && Math.hypot(tx,ty)<170 && Math.abs(df)<0.7;
      projs.push({type:'mleaf', state:'fly', x, y, vx:Math.cos(a)*220, vy:Math.sin(a)*220, speed:220, r:4, life:1.4, age:0, col:RAINBOW[(i*2)%5], homing:'near', move:'magicalleaf', mult:0.11});
    });
  } else if (kind==='proj'){
    const q = s.p, a0 = Math.atan2(d.y,d.x), n = q.n||1;
    for (let i=0;i<n;i++){
      const a = a0 + (n===1 ? 0 : (i/(n-1)-0.5)*2*(q.spread||0));
      projs.push({type:'proj', style:q.style, x:bx+d.x*10, y:by+d.y*10, vx:Math.cos(a)*q.speed, vy:Math.sin(a)*q.speed, r:q.r, life:q.life, age:0, move:s.move, mult:q.mult, burn:q.burn||0, slow:q.slow||0, big:!!q.big, ang:a, wob:0, stg:q.stg, root:q.root, psn:q.psn, wallBurst:!!q.wallBurst});
    }
  } else if (kind==='aircombo'){
    const a0 = Math.atan2(d.y,d.x), chain = P.airT>0 ? (P.airStep||0) : 0;
    const n = chain===1 ? 2 : (chain===2 ? 3 : 1), big = false, spread = 0.13; P.airStep=(chain+1)%3; P.airT=1.3;
    const token=0; P.airPending=null;
    for (let i=0;i<n;i++){
      const a = a0+(n===1?0:(i/(n-1)-0.5)*2*spread), r = 7;
      projs.push({type:'proj',style:'airslash',x:bx+d.x*12,y:by+d.y*10,vx:Math.cos(a)*270,vy:Math.sin(a)*270,r,life:0.78,age:0,move:'airslash',mult:0.27,big,ang:a,wob:0,basicComboStep:(chain+1)%3});
    }
    if (big){ P.airT = 0; cd.click = NOCD?0:1; shakeT=0.12; shakeMag=2; }
  } else if (kind==='melee'){
    const q = s.p, half = q.half*Math.PI/180;
    effects.push({type:'melee', fx:q.fx, x:bx+d.x*q.range*0.62, y:by+d.y*q.range*0.62, ang:Math.atan2(d.y,d.x), age:0, dur:0.32});
    if (coneCheck(d, bx, by, half, q.range)!==null){
      strike(s.move, q.mult, bx, by, T.x, bodyY(T), {});
      if (!T.dead && q.burn && Math.random()<q.burn) applyBurn();
    }
  } else if (kind==='dashhit'){
    const q = s.p, g = aimDir(P.x, P.y);
    P.dash = {dx:g.x, dy:g.y, speed:q.speed, t:q.dur, contact:q, hit:false, grabbed:false, tint:q.tint, trail:!!q.trail, ring:q.ring||null, fx:q.fx, move:s.move, follow:!!q.follow};
    P.row = rowFromAngle(g.x, g.y); P.trailT = 0;
    effects.push({type:'dust', x:P.x, y:P.y, age:0, dur:0.3});
  } else if (kind==='buff'){
    applyBuff(s);
  } else if (kind==='icecone'){
    const q = s.p, half = q.half*Math.PI/180, ang = Math.atan2(d.y,d.x), rs = q.range/90;
    for (let i=0;i<54;i++){
      const a = ang + rnd(-half,half), sp = rnd(95,145)*rs;
      parts.push({x:bx+d.x*8, y:by+d.y*8, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, age:-rnd(0,0.2), life:rnd(0.5,0.72), pal:'ice'});
    }
    const dist = coneCheck(d, bx, by, half, q.range);
    if (dist!==null) timers.push({t:dist/(130*rs), fn:()=>{ if (T.dead) return; strike(s.move, q.mult, bx, by, T.x, bodyY(T), {}); if (!T.dead) applySlow(); }});
  } else if (kind==='slam'){
    const q = s.p; let dx = mouse.x-P.x, dy = mouse.y-P.y; const L = Math.hypot(dx,dy)||1, m = Math.min(L, q.maxRange);
    effects.push({type:'liq', x:P.x+dx/L*m, y:P.y+dy/L*m, age:0, dur:q.delay+0.55, delay:q.delay, q, move:s.move, fired:false});
  } else if (kind==='jumpslam'){
    const q = s.p; let dx = mouse.x-P.x, dy = mouse.y-P.y; const L = Math.hypot(dx,dy)||1, mm = Math.min(L, q.maxRange);
    P.jump = {sx:P.x, sy:P.y, tx:P.x+dx/L*mm, ty:P.y+dy/L*mm, t:0, dur:0.55, q, move:s.move};
  } else if (kind==='wing'){
    wingCast(d, s);
  } else if (kind==='fury'){
    furyCast(d);
  } else if (kind==='brutal'){
    brutalSwing(d, s.move);
  } else if (kind==='arbokswing'){
    arbokSwing(d);
  } else if (kind==='poisonbite'){
    poisonBite(d);
  } else if (kind==='glare'){
    glareCast(d);
  } else if (kind==='aerial'){
    aerialCast(d);
  } else if (kind==='drillrun2'){
    drillRunCast(d);
  } else if (kind==='agility'){
    agilityCast();
  } else if (kind==='brave'){
    braveCast(d);
  } else if (kind==='laserfocus'){
    laserFocusCast();
  } else if (kind==='superfang'){
    superFangCast(d);
  } else if (kind==='whirl'){
    whirlCast();
  } else if (kind==='gust'){
    gustCast(d);
  } else if (kind==='twister'){
    twisterCast(d);
  } else if (kind==='stage'){
    const q = s.p; if (q.stages) addStages(P, q.stages);
    if (q.crit){ P.critStage = q.crit; pop(P.x, P.y-(P.body+26), 'Crit up!', '#ffe27a', false); timers.push({t:q.dur, fn:()=>{ P.critStage = 0; }}); }
    for (let i=0;i<6;i++) effects.push({type:'sparkle', x:P.x+rnd(-14,14), y:P.y-rnd(0,22), age:-rnd(0,0.2), dur:0.6, col:'steel'});
    if (q.quest){ P.hn = (P.hn||0)+1; const need=q.questMax||10; logMsg('Harden '+P.hn+'/'+need+(P.hn>=need?' - evolving!':'')); if (P.hn>=need && CUR.evo) evolve(CUR.evo); }
  } else if (kind==='xs'){
    const i = P.comboT>0 ? P.comboIdx : 0, half = 55*Math.PI/180;
    effects.push({type:'melee', fx:'slash', x:bx+d.x*20, y:by+d.y*20, ang:Math.atan2(d.y,d.x)+(i%2?0.8:-0.8), age:0, dur:0.3, col:'steel'});
    const before = T.hp;
    if (coneCheck(d, bx, by, half, 36)!==null) strike(s.move, i===2?0.8:0.6, bx, by, T.x, bodyY(T), {small:i<2});
    const landed = T.hp < before;
    if (landed) {
      P.comboIdx = (i+1)%3; P.comboT = 1.3;
      if (i===2 && !T.dead) { launchTarget(d.x*260, d.y*260, 0.28, 0.08, 0); cd.click = NOCD?0:0.5; }
    } else { P.comboIdx=0; P.comboT=0; }
  } else if (kind==='jab'){
    const half = 50*Math.PI/180, hit = (n)=>{ effects.push({type:'melee', fx:'bite', x:P.x+d.x*22, y:bodyY(P)+d.y*22, ang:Math.atan2(d.y,d.x), age:0, dur:0.25}); if (coneCheck(aimDir(P.x,bodyY(P)), P.x, bodyY(P), half, 34)!==null){ strike(s.move, 0.55, P.x, bodyY(P), T.x, bodyY(T), {small:true}); if (n && !T.dead && Math.random()<0.3) applyPoison(false); } };
    hit(0); timers.push({t:0.16, fn:()=>hit(1)});
  } else if (kind==='wind'){
    const g = aimDir(P.x, P.y); T.wind = {vx:g.x*520, vy:g.y*520, t:0.8, wallDmg:0.28};
    effects.push({type:'wind', x0:world.w/2, y0:world.h/2, dx:g.x, dy:g.y, age:0, dur:3, ox:0});
    effects[effects.length-1].x0 = world.w/2-g.x*(world.w/2+30); effects[effects.length-1].y0 = world.h/2-g.y*(world.w/2+30);
    shakeT = 0.15; shakeMag = 1; logMsg('Tailwind pushes your opponent toward your cursor.');
  } else if (kind==='sludge'){
    const ang = Math.atan2(d.y,d.x);
    effects.push({type:'wave', x:bx+d.x*6, y:by+d.y*6, ang, age:0, dur:0.95});
    const dist = coneCheck(d, bx, by, 35*Math.PI/180, 92);
    if (dist!==null) timers.push({t:dist/120, fn:()=>{
      if (T.dead) return;
      strike('sludgewave', 0.6, bx, by, T.x, bodyY(T), {});
      if (!T.dead && Math.random()<0.3) applyPoison(false);
    }});
  }
}
function applySleep(){
  if (T.dead) return;
  if (T.types.includes('grass')){ pop(T.x, T.y-34, 'Immune!', '#c8c8c8', false); logMsg('Sleep Powder: Grass types are immune to powder moves.'); return; }
  T.sleep = {t:3}; T.zT = 0;
  pop(T.x, T.y-34, 'Asleep!', '#ecec86', false); logMsg('Sleep Powder: your opponent falls asleep for 3 seconds.');
}
function applyPoison(powder){
  if (T.dead) return;
  if (T.types.some(t=>(powder && t==='grass') || t==='poison' || t==='steel')){ pop(T.x, T.y-34, 'Immune!', '#c8c8c8', false); logMsg('Poison: your opponent is immune to being poisoned.'); return; }
  T.psn = {t:6, tick:1};
  pop(T.x, T.y-34, 'Poisoned!', '#d28cff', false); logMsg('Your opponent is poisoned (5% max HP per second for 6s).');
}
function applySeed(){
  if (T.dead) return;
  if (T.types.includes('grass')){ pop(T.x, T.y-34, 'Immune!', '#c8c8c8', false); logMsg('Leech Seed: Grass types are immune.'); return; }
  T.seed = {t:6, tick:0.3, age:0};
  pop(T.x, T.y-34, 'Seeded!', '#9be07a', false); logMsg('Leech Seed: your opponent is seeded; you heal as it drains.');
}
function spawnLeaf(){
  const a = rnd(0, Math.PI*2), r = rnd(14,22);
  projs.push({type:'leaf', state:'hover', ox:Math.cos(a)*r, oy:Math.sin(a)*r*0.8, x:P.x+Math.cos(a)*r, y:bodyY(P)+Math.sin(a)*r*0.8, vx:0, vy:0, r:3, life:5, age:0, hover:0.22, move:'razorleaf', mult:0.2});
}

