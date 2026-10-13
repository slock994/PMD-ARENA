// ---------------- update ----------------
function update(dt){
  if (shakeT>0) shakeT -= dt;
  if (hitstop>0){ hitstop -= dt; return; }
  // Keep the combat mirror close to the same predicted pose shown by interpolation.
  // This reduces attacks resolving against a visibly outdated remote position.
  if (window.PMD_MP && window.PMD_MP.active && typeof window.PMD_MP.syncTargetPose === 'function') window.PMD_MP.syncTargetPose();
  for (const k in cd) if (cd[k]>0) cd[k] = NOCD ? 0 : Math.max(0, cd[k]-dt);
  if(window.IMMORTAL_MODE) P.hp=P.maxhp;
  const ml=document.getElementById('moveList'); if(ml){for(const b of ml.querySelectorAll('.move-button')){const sl=b.dataset.slot, rem=cd[sl]||0, cover=b.querySelector('.cooldown-cover'); b.classList.toggle('cooling',rem>0&&!NOCD); cover.hidden=!(rem>0&&!NOCD); cover.textContent=rem>0&&!NOCD?rem.toFixed(1):'';}}
  if (flashA>0) flashA = Math.max(0, flashA-dt*2.2);
  updateBuffs(dt);
  for (let i=motes.length-1;i>=0;i--){ motes[i].age += dt; if (motes[i].age>motes[i].life) motes.splice(i,1); }
  for (let i=P.trail.length-1;i>=0;i--){ P.trail[i].age += dt; if (P.trail[i].age>0.25) P.trail.splice(i,1); }
  if (P.dash && ((P.curSlot && P.curSlot.trail) || P.dash.trail)){
    P.trailT -= dt;
    if (P.trailT<=0){ P.trailT = 0.04; P.trail.push({x:P.x, y:P.y, row:P.row, anim:P.anim, frame:P.frame, age:0, tint:P.dash.tint}); effects.push({type:'dust', x:P.x, y:P.y, age:0, dur:0.3}); }
  }
  for (let i=timers.length-1;i>=0;i--){ timers[i].t -= dt; if (timers[i].t<=0){ const f = timers[i].fn; timers.splice(i,1); f(); } }

  // player
  const cur = P.A[P.anim];
  if (!P.dash) P.row = rowFromAngle(mouse.x-P.x, mouse.y-P.y);
  const mx = (CUR.immobile||P.noMove||(window.PMD_MP && window.PMD_MP.blocksMovement())) ? 0 : (keys.KeyD?1:0)-(keys.KeyA?1:0), my = (CUR.immobile||P.noMove||(window.PMD_MP && window.PMD_MP.blocksMovement())) ? 0 : (keys.KeyS?1:0)-(keys.KeyW?1:0), moving = (mx||my);
  if (P.dash){ if ((P.dash.follow || (P.curSlot && P.curSlot.steer)) && !P.dash.grabbed) steerDash(dt); P.x += P.dash.dx*P.dash.speed*dt; P.y += P.dash.dy*P.dash.speed*dt; if (P.dash.contact) updateDashContact(dt); }
  else if (!P.locked){ if (moving){ const L=Math.hypot(mx,my); P.x += mx/L*P.speed*(P.speedMul||1)*stageMult(P.stages.spe)*(window.PMD_MP && window.PMD_MP.isSlowed()?0.5:1)*dt; P.y += my/L*P.speed*(P.speedMul||1)*stageMult(P.stages.spe)*(window.PMD_MP && window.PMD_MP.isSlowed()?0.5:1)*dt; } }
  else if (!P.channel && !(P.curSlot && P.curSlot.noLunge) && cur.rush!=null && cur.hit!=null && P.frame>=cur.rush && P.frame<cur.hit){
    const L = Math.hypot(mouse.x-P.x, mouse.y-P.y)||1;
    P.x += (mouse.x-P.x)/L*50*dt; P.y += (mouse.y-P.y)/L*50*dt;
  }
  if (P.jump){ const j = P.jump; j.t += dt; const u = Math.min(1, j.t/j.dur); P.x = j.sx+(j.tx-j.sx)*u; P.y = j.sy+(j.ty-j.sy)*u; P.z = Math.sin(u*Math.PI)*34; if (u>=1){ P.z = 0; P.jump = null; landSlam(j); } }
  P.x = Math.max(24, Math.min(world.w-24, P.x));
  P.y = Math.max(40, Math.min(world.h-14, P.y));
  if (!P.locked && !P.casting){
    const loopName = '';
    if (P.hurtT > 0 && P.A.Hurt) setAnimOn(P, 'Hurt', false);
    else if (window.PMD_MP && window.PMD_MP.remaining('sleep') > 0 && P.A.Sleep) setAnimOn(P, 'Sleep', false);
    else if (P.channel && P.channel.mobile) setAnimOn(P, moving ? 'Walk' : P.channel.anim, false);
    else if (loopName) setAnimOn(P, loopName, false); else setAnimOn(P, moving ? 'Walk' : 'Idle', false);
  }
  if (P.channel){
    const c = P.channel, s = SLOTS[c.slot]; c.t += dt;
    if (c.kind==='windup'){
      const d=aimDir(P.x,bodyY(P)); c.ang=Math.atan2(d.y,d.x); P.row=rowFromAngle(d.x,d.y);
      if(c.t>=s.windup){ P.channel=null; P.noCancel=false; P.noMove=false; P.locked=false; P.casting=false; fire(s.kind,s); }
    } else if(c.kind==='aquaJetHold'){
      const d=aimDir(P.x,bodyY(P)); P.x+=d.x*420*dt; P.y+=d.y*420*dt; P.x=Math.max(24,Math.min(world.w-24,P.x)); P.y=Math.max(40,Math.min(world.h-14,P.y)); P.row=rowFromAngle(d.x,d.y); c.hitT-=dt; effects.push({type:'ring2',x:P.x-d.x*8,y:bodyY(P)-d.y*4,age:0,dur:0.16,col:'water'});
      if(P.jetBubble){
        const jb=P.jetBubble, bs=SLOTS.click, st=bs.p; jb.t+=dt; jb.next-=dt;
        while(jb.next<=0 && jb.shots<st.limitedShots && keys.Mouse0){
          const aim=aimDir(P.x,bodyY(P)), a=Math.atan2(aim.y,aim.x)+rnd(-(st.spread||0),st.spread||0);
          projs.push({type:'proj',style:'bubble',x:P.x+aim.x*10,y:bodyY(P)+aim.y*10,vx:Math.cos(a)*(st.speed||82),vy:Math.sin(a)*(st.speed||82),r:st.r||4,life:st.life||1,age:0,move:bs.move,mult:st.mult||.1,burn:0,slow:st.slow||0,big:false,ang:a,wob:rnd(0,6)});
          jb.shots++; jb.next+=st.rate||.5;
        }
        if(!keys.Mouse0 || jb.shots>=st.limitedShots){cd.click=NOCD?0:Math.min(5,Math.max(.5,jb.shots*.5));P.jetBubble=null;}
      }
      if(c.hitT<=0){c.hitT=0.12;if(!T.dead&&Math.hypot(T.x-P.x,T.y-P.y)<25){const before=T.hp;strike('aquajet',0.5,P.x,P.y,T.x,bodyY(T),{small:true});if(T.hp<before&&!T.dead)launchTarget(d.x*360,d.y*360,.36,.12,0);if(T.hp<before)endChannel();}}
      if(P.channel&&(!keys[s.hold]||c.t>=5))endChannel();
    } else if(c.kind==='hydroTwin'){
      const d=aimDir(P.x,bodyY(P)), target=Math.atan2(d.y,d.x), maxTurn=1.6*dt; let delta=target-c.ang; while(delta>Math.PI)delta-=Math.PI*2; while(delta<-Math.PI)delta+=Math.PI*2; c.ang+=Math.max(-maxTurn,Math.min(maxTurn,delta)); P.row=rowFromAngle(Math.cos(c.ang),Math.sin(c.ang)); c.hitT-=dt;
      for(const side of [-1,1]){ const ox=P.x,oy=bodyY(P)-3,dx=Math.cos(c.ang),dy=Math.sin(c.ang),off=side*5, sx=ox-dy*off,sy=oy+dx*off; effects.push({type:'laser',x:sx,y:sy,ang:c.ang,age:0,dur:0.12,col:'water',len:Math.min(500,c.t*220,clipLen(P.x,bodyY(P)-3,dx,dy,500))}); }
      if(c.hitT<=0){ c.hitT=0.18; const dx=Math.cos(c.ang),dy=Math.sin(c.ang),rx=T.x-P.x,ry=bodyY(T)-bodyY(P),along=rx*dx+ry*dy,perp=Math.abs(rx*dy-ry*dx); if(!T.dead&&along>0&&along<Math.min(500,c.t*220)&&perp<17){ const hp=T.hp; strike('hydropump',0.18,P.x,bodyY(P),T.x,bodyY(T),{small:true}); if(T.hp<hp&&!T.dead)launchTarget(dx*180,dy*180,0.3,0.08,0); } const edge=Math.min((dx>0?(world.w-20-P.x)/dx:dx<0?(24-P.x)/dx:1e9),(dy>0?(world.h-16-P.y)/dy:dy<0?(40-P.y)/dy:1e9)); if(c.t*220>=edge&&!c.wallBurst){c.wallBurst=true;const wx=P.x+dx*edge,wy=bodyY(P)+dy*edge;effects.push({type:'ring2',x:wx,y:wy,age:0,dur:.45,col:'water'});if(!T.dead&&Math.hypot(T.x-wx,bodyY(T)-wy)<40)strike('hydropump',.12,wx,wy,T.x,bodyY(T),{small:true});} }
      if(!keys[s.hold]||c.t>=10)endChannel();
    } else if (c.kind==='razor'){
      c.next -= dt;
      while (c.next<=0 && c.t<s.maxHold && (s.p.limitedShots==null || c.shots<s.p.limitedShots)){ spawnLeaf(); c.shots++; c.next += 0.2; }
      if (!keys[s.hold] || c.t>=s.maxHold || (s.p.limitedShots!=null && c.shots>=s.p.limitedShots)) endChannel();
    } else if (c.kind==='synth'){
      c.sp -= dt;
      if (c.sp<=0){ c.sp = 0.1; effects.push({type:'sparkle', x:P.x+rnd(-18,18), y:P.y-rnd(0,20), age:0, dur:0.6}); }
      if (c.t>0.35){
        c.tick -= dt;
        while (c.tick<=0){ c.tick += 0.25; healSelf(P.maxhp*0.03); }
        c.ring = (c.ring||0) - dt; if (c.ring<=0){ c.ring = 1; effects.push({type:'ring2', x:P.x, y:P.y, age:0, dur:0.5}); }
      }
      if ((!keys[s.hold] && c.t>=0.35) || c.t>=s.maxHold) endChannel();
    } else if (c.kind==='stream'){
      if(s.p.limitedShots!=null){
        c.next-=dt;
        while(c.next<=0&&c.shots<s.p.limitedShots&&c.t<s.maxHold){
          const st=s.p, d=aimDir(P.x,bodyY(P)), baseAng=Math.atan2(d.y,d.x), a=baseAng+rnd(-(st.spread||0),(st.spread||0));
          // One real, damage-capable bubble per shot. Do not call streamTick here:
          // its internal timer expects per-frame calls and caused empty/fake multiplayer bubbles.
          projs.push({type:'proj',style:'bubble',x:P.x+d.x*10,y:bodyY(P)+d.y*10,
            vx:Math.cos(a)*(st.speed||82),vy:Math.sin(a)*(st.speed||82),r:st.r||4,
            life:st.life||1,age:0,move:s.move,mult:st.mult||0.1,burn:0,
            slow:st.slow||0,big:false,ang:a,wob:rnd(0,6)});
          c.shots++; c.next+=st.rate||0.5;
        }
        if(!keys[s.hold]||c.t>=s.maxHold||c.shots>=s.p.limitedShots){ endChannel(); }
      } else streamTick(c, s, s.p, dt, 'a');
      if (c.combo) streamTick(c, SLOTS.click, Object.assign({}, SLOTS.click.p, {range:s.p.range, half:s.p.half}), dt, 'b');
      const st = s.p, done = c.combo ? (!(keys.Mouse0 && keys.Mouse2) || c.t>=3) : (s.hold ? (!keys[s.hold] || c.t>=(s.maxHold||5)) : (st.dur ? c.t>=st.dur : c.t>=s.maxHold));
      if (done) endChannel();
    } else if (c.kind==='solar'){
      const ox = P.x, oy = bodyY(P)-4, sp = s.p;
      if (c.phase==='charge'){
        for (let i=0;i<3;i++){ const a = rnd(0,Math.PI*2), r = rnd(26,42); motes.push({sx:ox+Math.cos(a)*r, sy:oy+Math.sin(a)*r*0.8, age:0, life:0.35}); }
        if (c.t>=0.8){ c.phase = 'beam'; c.bt = 0; c.hitT = 0; const d = aimDir(ox,oy); c.ang = Math.atan2(d.y,d.x); setAnimOn(P, P.A.Shoot ? 'Shoot' : P.anim, false); flashA = 0.35; }
      } else {
        c.bt += dt;
        const turn = sp.turn*dt; c.ang += Math.max(-turn, Math.min(turn, wrapA(Math.atan2(mouse.y-oy, mouse.x-ox)-c.ang)));
        P.row = rowFromAngle(Math.cos(c.ang), Math.sin(c.ang)); shakeT = 0.08; shakeMag = 1; c.hitT -= dt;
        if (c.hitT<=0){ c.hitT = 0.2; if (!T.dead){ const bxv = Math.cos(c.ang), byv = Math.sin(c.ang), rx = T.x-ox, ry = bodyY(T)-oy, along = rx*bxv+ry*byv, perp = Math.abs(rx*byv-ry*bxv); if (along>0 && along<460 && perp<=17) strike('solarbeam', 0.14, ox, oy, T.x, bodyY(T), {small:true}); } }
        if (c.bt>=sp.maxBeam || (!keys[s.hold] && c.bt>=0.6)) endChannel();
      }
    } else if (c.kind==='quiver'){
      if (!c.q){ c.q = 1; addStages(P, {spa:1,spd:1,spe:1}); P.quiverT=5; pop(P.x,P.y-(P.body+28),'Quiver Dance!','#cbb7ff',false); }
      if (c.t>=0.25) endChannel();
    } else if (c.kind==='laser'){
      if (c.t<0.5){ const d = aimDir(P.x, bodyY(P)); c.ang = Math.atan2(d.y,d.x); P.row = rowFromAngle(d.x,d.y); }
      else { fireLaser(c.ang, s); endChannel(); }
    } else if (c.kind==='hurricane'){
      updateHurricane(c, s, dt);
      if (!keys[s.hold] || c.t>=s.maxHold) endChannel();
    } else if (c.kind==='sucker'){
      if (!keys[s.hold] || c.t>=s.maxHold){ suckerCast(c, s); endChannel(); }
    } else if (c.kind==='drillpeck'){
      drillPeckTick(c, s, dt);
      if (!keys[s.hold] || c.t>=s.maxHold) endChannel();
    }
  }
  const fin = stepAnim(P, P.agi>0 ? dt*1.5 : dt);
  if (P.pending && !P.pending.fired){
    const a = P.A[P.anim];
    const hf = P.pending.frame!=null ? P.pending.frame : (a.hit!=null ? a.hit : Math.min(2, a.dur.length-1));
    if (P.frame >= hf || fin){ P.pending.fired = true; fire(P.pending.kind, P.pending.slot); }
  }
  if (fin && !P.channel && !P.jump && !(P.dash && P.dash.contact)){ P.casting = false; P.speedMul = 1; P.locked = false; P.dash = null; P.pending = null; P.curSlot = null; setAnimOn(P,'Idle',false); P.once = false; }

  // dummy
  updateAI(dt);
  T.row = rowFromAngle(P.x-T.x, P.y-T.y);
  const mpRemoteTarget = !!(window.PMD_MP && window.PMD_MP.active && window.PMD_MP.peerPresent);
  if (!mpRemoteTarget) { T.x += T.kx*dt; T.y += T.ky*dt; }
  const decay = Math.exp(-12*dt); T.kx = mpRemoteTarget ? 0 : T.kx*decay; T.ky = mpRemoteTarget ? 0 : T.ky*decay;
  T.x = Math.max(24, Math.min(world.w-24, T.x)); T.y = Math.max(40, Math.min(world.h-14, T.y));
  if (T.slide && !T.dead && !(mpRemoteTarget && T.slide._mpRemote)){
    const sl = T.slide, nx = T.x+sl.vx*dt, ny = T.y+sl.vy*dt;
    const cx = Math.max(24, Math.min(world.w-24, nx)), cy = Math.max(40, Math.min(world.h-14, ny));
    T.x = cx; T.y = cy; sl.t -= dt; T.hurtT = Math.max(T.hurtT, 0.1); setAnimOn(T,'Hurt',false);
    if (cx!==nx || cy!==ny){
      if (sl.bounce){ if (cx!==nx) sl.vx *= -0.48; if (cy!==ny) sl.vy *= -0.48; sl.bounce--; sl.t = Math.max(sl.t,0.12); if (sl.wall>0) hurtTarget(sl.wall, 'Wall impact', T.x, bodyY(T), true); }
      else { T.slide = null; if (sl.wall>0) hurtTarget(sl.wall, 'Wall impact', T.x, bodyY(T), true); }
    }
    else if (sl.t<=0){ T.slide = null; if (sl.land>0) hurtTarget(sl.land, 'Landing', T.x, bodyY(T), false); }
  }
  if (T.flashT>0) T.flashT -= dt;
  if (T.dead){
    stepAnim(T, dt); T.deadT -= dt;
    if (T.deadT<=0){ if(window.PMD_MP && window.PMD_MP.active && !window.PMD_MP.peerPresent){ T.dead=true; T.deadT=999999; } else { T.dead=false; T.hp=T.maxhp; T.x=world.w*0.72; T.y=world.h*0.57; T.kx=T.ky=0; setAnimOn(T,'Idle',false); T.once=false; } }
  } else {
    if (T.hurtT>0) T.hurtT -= dt;
    if ((!window.PMD_MP || !window.PMD_MP.active || !window.PMD_MP.peerPresent) && T.hurtT<=0){ const want = T.sleep ? 'Sleep' : 'Idle'; if (T.anim!==want) setAnimOn(T,want,false); }
    stepAnim(T, dt);
    if (T.sleep){
      T.sleep.t -= dt; T.zT -= dt;
      if (T.zT<=0){ T.zT = 0.7; effects.push({type:'zzz', x:T.x+6, y:bodyY(T)-8, age:0, dur:0.9}); }
      if (T.sleep.t<=0){ T.sleep = null; pop(T.x, T.y-34, 'Woke up', '#ecec86', false); }
    }
    if (T.seed){
      T.seed.age += dt; T.seed.t -= dt; T.seed.tick -= dt;
      if (T.seed.tick<=0){
        T.seed.tick += 0.75;
        const amt = Math.max(1, Math.round(T.maxhp/32));
        T.hp = Math.max(0, T.hp-amt);
        pop(T.x+rnd(-5,5), T.y-30, amt, '#9be07a', false);
        orbs.push({x:T.x, y:bodyY(T), amt});
        killIfDead();
      }
      if (T.seed && T.seed.t<=0) T.seed = null;
    }
    if (T.psn){
      T.psn.t -= dt; T.psn.tick -= dt; T.bubbleT -= dt;
      if (T.bubbleT<=0){ T.bubbleT = 0.28; effects.push({type:'bubble', x:T.x+rnd(-7,7), y:bodyY(T)+rnd(0,6), age:0, dur:0.8}); }
      if (T.psn.tick<=0){
        T.psn.tick += 1;
        const amt = Math.max(1, Math.round(T.maxhp*0.05));
        T.hp = Math.max(0, T.hp-amt); T.flashT = 0.05;
        pop(T.x+rnd(-5,5), T.y-30, amt, '#d28cff', false);
        killIfDead();
      }
      if (T.psn && T.psn.t<=0) T.psn = null;
    }
    if (T.burn){
      T.burn.t -= dt; T.burn.tick -= dt; T.burnFx -= dt;
      if (T.burnFx<=0){ T.burnFx = 0.22; effects.push({type:'flamelet', x:T.x+rnd(-7,7), y:bodyY(T)+rnd(-2,8), age:0, dur:0.5}); }
      if (T.burn.tick<=0){
        T.burn.tick += 0.5; const amt = Math.max(1, Math.round(T.maxhp*0.015));
        T.hp = Math.max(0, T.hp-amt); T.flashT = 0.04; pop(T.x+rnd(-5,5), T.y-30, amt, '#ff9a4a', false); killIfDead();
      }
      if (T.burn && T.burn.t<=0) T.burn = null;
    }
    if (T.slow){ T.slow.t -= dt; if (T.slow.t<=0) T.slow = null; }
  }

  // drain orbs fly back to Bulbasaur
  for (let i=orbs.length-1;i>=0;i--){
    const o = orbs[i], tx = P.x, ty = bodyY(P), dx = tx-o.x, dy = ty-o.y, L = Math.hypot(dx,dy);
    if (L < 6){
      if (P.hp>0){ P.hp = Math.min(P.maxhp, P.hp+o.amt); }
      pop(P.x, P.y-(P.body+23), '+'+o.amt, '#7dff8a', false);
      effects.push({type:'heal', x:P.x, y:bodyY(P), age:0, dur:0.4});
      orbs.splice(i,1);
    } else { const sp = 150*dt; o.x += dx/L*Math.min(sp,L); o.y += dy/L*Math.min(sp,L); }
  }

  // projectiles
  for (let i=projs.length-1;i>=0;i--){
    const p = projs[i]; p.age += dt;
    if (p.hurricane){
      // A projectile may be caught by the locally cast Hurricane or by a remote
      // player's synchronized Hurricane field. This lets each projectile owner
      // simulate its own caught projectile, so snapshots stay consistent.
      const localH = hurricane;
      const remoteH = window.PMD_MP && window.PMD_MP.active && window.PMD_MP.netHurricane;
      const h = localH || remoteH;
      if (!h){ p.hurricane=false; p.vx=Math.cos(p.hAngle||0)*320; p.vy=Math.sin(p.hAngle||0)*260; continue; }
      p.hOrbitAge=(Number(p.hOrbitAge)||0)+dt;
      const spin=3.2+Math.min(8.5,((h.age||p.hOrbitAge)*1.25));
      p.hAngle += dt*spin;
      const target=118;
      p.hRing += (target-p.hRing)*Math.min(1,dt*(1.2+Math.min(2,p.hOrbitAge)));
      p.hRing = Math.max(70,p.hRing+Math.sin(p.age*5+(p.hAngle||0))*5);
      p.x = h.x+Math.cos(p.hAngle)*p.hRing; p.y = h.y+Math.sin(p.hAngle)*p.hRing*0.62;
      continue;
    }
    // Catch this client's projectiles in a remote Hurricane field too. The
    // projectile owner keeps simulation authority and broadcasts the orbiting state.
    const remoteH = window.PMD_MP && window.PMD_MP.active && window.PMD_MP.netHurricane;
    const field = hurricane || remoteH;
    if (field && !p.hurricane && Math.hypot(p.x-field.x,p.y-field.y)<150) {
      p.hurricane=true;
      p.hAngle=Math.atan2(p.y-field.y,p.x-field.x);
      p.hRing=Math.max(76,Math.min(150,Math.hypot(p.x-field.x,p.y-field.y)));
      p.hBaseRing=p.hRing;
      p.hOrbitAge=0;
      p.hInertiaVX=Number(p.vx)||0; p.hInertiaVY=Number(p.vy)||0;
    }
    if ((p.type==='leaf' || p.type==='mleaf') && p.state==='hover'){
      p.x = P.x+p.ox; p.y = bodyY(P)+p.oy;
      if (p.age>=p.hover){
        p.state = 'fly'; p.age = 0;
        if (p.type==='leaf'){ const d = aimDir(p.x, p.y), a = Math.atan2(d.y,d.x)+rnd(-0.05,0.05); p.vx = Math.cos(a)*280; p.vy = Math.sin(a)*280; }
        else { p.vx = Math.cos(p.ang)*130; p.vy = Math.sin(p.ang)*130; }
      }
      continue;
    }
    if (p.type==='mleaf' && !T.dead){
      const tx = T.x, ty = bodyY(T), dist = Math.hypot(tx-p.x, ty-p.y);
      const always = p.homing==='always', near = p.homing==='near' && dist<64;
      if (always || near){
        let cur = Math.atan2(p.vy,p.vx), diff = Math.atan2(ty-p.y, tx-p.x) - cur;
        while (diff>Math.PI) diff -= 2*Math.PI; while (diff<-Math.PI) diff += 2*Math.PI;
        const turn = (near ? 22 : (dist<45 ? 16 : 8))*dt; cur += Math.max(-turn, Math.min(turn, diff));
        if (always) p.speed = Math.min(200, p.speed+260*dt);
        p.vx = Math.cos(cur)*p.speed; p.vy = Math.sin(cur)*p.speed;
      }
    }
    p.x += p.vx*dt; p.y += p.vy*dt;
    const hydroWall = !!p.wallBurst && (p.x<=19 || p.x>=world.w-19 || p.y<=33 || p.y>=world.h-17);
    let remove = p.age>p.life || p.x<-10 || p.x>world.w+10 || p.y<-10 || p.y>world.h+10 || hydroWall;
    if(remove && p.wallBurst && p.age<=p.life && (hydroWall || p.x<-10 || p.x>world.w+10 || p.y<-10 || p.y>world.h+10)){
      const wx=Math.max(18,Math.min(world.w-18,p.x)),wy=Math.max(32,Math.min(world.h-16,p.y));
      effects.push({type:'ring2',x:wx,y:wy,age:0,dur:.48,col:'water'}); shakeT=.06; shakeMag=1;
      if(!T.dead&&Math.hypot(T.x-wx,bodyY(T)-wy)<42)strike(p.move,.18,wx,wy,T.x,bodyY(T),{small:true});
    }
    if (!remove && !T.dead && Math.hypot(p.x-T.x, p.y-bodyY(T)) < p.r+11){
      if (p.type==='seed'){
        effects.push({type:'hit', x:p.x, y:p.y, age:0, dur:5*4*TICK, pal:PAL.grass, s:0.6});
        T.flashT = 0.05; applySeed();
      } else if (p.type==='proj'){
        const hpBeforeProjectile=T.hp;
        strike(p.move, p.mult, p.x-p.vx*0.05, p.y-p.vy*0.05, p.x, p.y, {small:!p.big});
        if(p.basicComboToken && P.airPending && P.airPending.token===p.basicComboToken && T.hp<hpBeforeProjectile){
          // A combo advances only on a confirmed HP-changing hit. Misses are
          // counted exactly once when the projectile is removed below.
          P.airPending.hit=true; P.airStep=p.basicComboStep; P.airT=1.3; P.airPending=null;
        }
        if (!T.dead && p.burn && Math.random()<p.burn) applyBurn();
        if (!T.dead && p.slow && Math.random()<p.slow) applySlow();
        if (!T.dead && p.stg) addStages(T, p.stg);
        if (!T.dead && p.root){ T.root = p.root; pop(T.x, T.y-34, 'Stuck!', '#f2f2f2', false); }
        if (!T.dead && p.psn && Math.random()<p.psn) applyPoison(false);
      } else {
        strike(p.move, p.mult, p.x-p.vx*0.05, p.y-p.vy*0.05, p.x, p.y, {small:true, crit:Math.random()<(p.crit ?? (p.type==='mleaf' ? 0.0417 : 0.125))});
      }
      remove = true;
    }
    if (remove) { if(p.basicComboToken && P.airPending && P.airPending.token===p.basicComboToken && !P.airPending.hit){P.airPending.remaining=Math.max(0,P.airPending.remaining-1);if(P.airPending.remaining===0){P.airStep=0;P.airT=0;P.airPending=null;}} projs.splice(i,1); }
  }

  // powder particles
  for (let i=parts.length-1;i>=0;i--){
    const q = parts[i]; q.age += dt;
    if (q.age<0) continue;
    q.x += q.vx*dt; q.y += q.vy*dt; const dr = Math.exp(-2.2*dt); q.vx *= dr; q.vy *= dr; q.y -= 6*dt;
    if (q.age>q.life) parts.splice(i,1);
  }

  // vines: resolve the slam hit when the tip lands
  for (const e of effects){
    if (e.type!=='vines') continue;
    const k = e.age/TICK;
    for (const v of e.v){
      if (!v.hit && k-v.delay >= 12){
        v.hit = true;
        if (!T.dead && Math.hypot(T.x-v.gx, T.y-v.gy) < 23) strike('vinewhip', 0.6, P.x, P.y, v.gx, v.gy-4, {});
      }
    }
  }
  for (const e of effects){
    if (e.type!=='liq' || e.fired || e.age<e.delay) continue;
    e.fired = true; const q = e.q;
    shakeT = 0.25; shakeMag = 3; hitstop = Math.max(hitstop, 0.06);
    if (!T.dead){
      const dist = Math.hypot(T.x-e.x, T.y-e.y);
      if (dist<=q.r){ strike(e.move, q.mult, e.x, e.y, T.x, bodyY(T), {}); }
      else if (dist<=q.waveR){ timers.push({t:dist/180, fn:()=>{ if (!T.dead) strike(e.move, q.waveMult, e.x, e.y, T.x, bodyY(T), {small:true}); }}); }
    }
  }
  for (let i=effects.length-1;i>=0;i--){ effects[i].age += dt; if (effects[i].age>effects[i].dur) effects.splice(i,1); }
  for (let i=numbers.length-1;i>=0;i--){ numbers[i].age += dt; if (numbers[i].age>0.9) numbers.splice(i,1); }
}

