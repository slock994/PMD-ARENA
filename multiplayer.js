/*
 * PMD Arena multiplayer adapter.
 * The original combat engine remains the source of truth for moves and animations.
 * Locally controlled P is the player; T is a live mirror of the remote player.
 */
(function () {
  'use strict';

  const MP = {
    active: false,
    peerPresent: false,
    id: '',
    remotePlayers: new Map(),
    activeTargetId: null,
    applyingPeerState: false,
    suppressDamage: false,
    socket: null,
    code: '',
    role: '',
    name: '',
    peerName: '',
    lastState: 0,
    // Predict remote motion forward from estimated transit time, then keep a small jitter buffer.
    interpolationDelayMs: 30,
    latencyMs: null,
    latencySamples: [],
    arrivalJitterMs: 0,
    netStatus: {},
    netSlide: null,
    netHurricane: null,
    netForcedPos: null,
    netFaintT: 0,
    netFaintPos: null,
    hitContext: null,
    remoteVisuals: null,
    peerPokemon: 'pikachu',
    statusDefaults: { sleep: 3, psn: 6, burn: 5, seed: 6, slow: 4, root: 1, stag: 1.5, grabbed: 1 },
    wsUrl() {
      const params = new URLSearchParams(location.search);
      const override = params.get('ws');
      if (override) return override;
      return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
    },
    send(packet) {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Keep real-time traffic fresh instead of allowing stale snapshots to queue.
        // Combat events are never dropped by this guard.
        const queued = Number(this.socket.bufferedAmount) || 0;
        if (packet && packet.type === 'visuals' && queued > 96 * 1024) return;
        if (packet && packet.type === 'state' && queued > 128 * 1024) return;
        try { this.socket.send(JSON.stringify(packet)); } catch (_) {}
      }
    },
    event(event) {
      if (!this.active || !this.peerPresent || this.applyingPeerState || !this.activeTargetId) return;
      this.send({ type: 'event', targetId: this.activeTargetId, event });
    },
    eventAll(event) {
      if (!this.active || this.applyingPeerState) return;
      this.send({ type: 'event', targetId: '*', event });
    },
    rememberPlayer(id, name, state, visuals) {
      if (!id || id === this.id) return;
      const key = String(id), rec = this.remotePlayers.get(key) || { id: key, name: 'Trainer', state: null, visuals: null, loading: false, samples: [] };
      if (!Array.isArray(rec.samples)) rec.samples = [];
      if (name) rec.name = String(name).slice(0, 20);
      if (state && typeof state === 'object') {
        rec.state = state;
        if (state.name) rec.name = String(state.name).slice(0, 20);
        const receivedAt = performance.now();
        rec.lastSeen = receivedAt;
        // applyPeerState also remembers the same object; only measure timing once per packet.
        if (rec._lastSnapshotState !== state) {
          const ownRtt = Number(this.latencyMs) > 0 ? Number(this.latencyMs) : 90;
          const peerRtt = Number(state.rtt) > 0 ? Number(state.rtt) : 90;
          // Approximate the time spent travelling sender -> server -> receiver.
          // Backdate samples so short forward prediction compensates for network transit.
          const transitMs = Math.max(0, Math.min(180, (ownRtt + peerRtt) * 0.5));
          const at = receivedAt - transitMs;
          if (rec.lastArrivalAt != null) {
            const interval = receivedAt - rec.lastArrivalAt;
            const expected = 25; // state cadence below: 40 Hz
            const deviation = Math.abs(interval - expected);
            this.arrivalJitterMs = this.arrivalJitterMs * 0.85 + deviation * 0.15;
            this.interpolationDelayMs = Math.max(24, Math.min(48, 24 + this.arrivalJitterMs * 1.2));
          }
          rec.lastArrivalAt = receivedAt;
          rec.samples.push({ at, state });
          rec._lastSnapshotState = state;
          // Keep enough recent history to interpolate through short packet bursts.
          if (rec.samples.length > 20) rec.samples.splice(0, rec.samples.length - 20);
        }
      }
      if (visuals) { rec.visuals = visuals; rec.visualsReceivedAt = performance.now(); }
      this.remotePlayers.set(key, rec);
      this.refreshPlayerCount();
      return rec;
    },
    samplePose(rec, renderAt) {
      if (!rec) return null;
      const samples = rec.samples || [];
      if (!samples.length) {
        const st = rec.state;
        return st ? { x: Number(st.x) || 0, y: Number(st.y) || 0, row: Number(st.row) || 0, z: Number(st.z) || 0, state: st, sampleAt: performance.now(), renderAt: performance.now() } : null;
      }
      const now = performance.now();
      const targetAt = Number.isFinite(renderAt) ? renderAt : now - this.interpolationDelayMs;
      if (targetAt <= samples[0].at) {
        const sm = samples[0], st = sm.state;
        return { x: Number(st.x) || 0, y: Number(st.y) || 0, row: Number(st.row) || 0, z: Number(st.z) || 0, state: st, sampleAt: sm.at, renderAt: targetAt };
      }
      for (let i = 0; i < samples.length - 1; i++) {
        const a = samples[i], b = samples[i + 1];
        if (targetAt <= b.at) {
          const span = Math.max(1, b.at - a.at), u = Math.max(0, Math.min(1, (targetAt - a.at) / span));
          // Use the earlier sample's animation and advance it to renderAt, instead of
          // snapping between animation frames received in adjacent packets.
          const sa = a.state, sb = b.state;
          return {
            x: (Number(sa.x) || 0) + ((Number(sb.x) || 0) - (Number(sa.x) || 0)) * u,
            y: (Number(sa.y) || 0) + ((Number(sb.y) || 0) - (Number(sa.y) || 0)) * u,
            row: u < 0.5 ? (Number(sa.row) || 0) : (Number(sb.row) || 0),
            z: (Number(sa.z) || 0) + ((Number(sb.z) || 0) - (Number(sa.z) || 0)) * u,
            state: sa, sampleAt: a.at, renderAt: targetAt
          };
        }
      }
      const last = samples[samples.length - 1], st = last.state;
      const prev = samples.length > 1 ? samples[samples.length - 2] : null;
      // Short forward prediction hides the transport delay. Stop predicting immediately
      // for idle/dead fighters to avoid sliding past a stop; clamp to arena bounds.
      const extra = Math.max(0, Math.min(0.075, (targetAt - last.at) / 1000));
      let vx = 0, vy = 0;
      if (prev && !st.dead && (st.anim === 'Walk' || st.dash || st.channel || st.netSlide || Math.hypot((Number(st.x)||0)-(Number(prev.state.x)||0), (Number(st.y)||0)-(Number(prev.state.y)||0)) > 2)) {
        const dt = Math.max(0.001, (last.at - prev.at) / 1000);
        vx = ((Number(st.x) || 0) - (Number(prev.state.x) || 0)) / dt;
        vy = ((Number(st.y) || 0) - (Number(prev.state.y) || 0)) / dt;
        const speed = Math.hypot(vx, vy), cap = st.dash ? 760 : 520;
        if (speed > cap) { vx *= cap / speed; vy *= cap / speed; }
      }
      return {
        x: Math.max(24, Math.min(world.w - 24, (Number(st.x) || 0) + vx * extra)),
        y: Math.max(40, Math.min(world.h - 14, (Number(st.y) || 0) + vy * extra)),
        row: Number(st.row) || 0, z: Number(st.z) || 0, state: st, sampleAt: last.at, renderAt: targetAt
      };
    },
    animationPose(rec, pose, spriteSet) {
      const st = pose && pose.state;
      if (!st || !spriteSet) return { frame: 0, t: 0 };
      const name = st.anim && spriteSet[st.anim] ? st.anim : 'Idle';
      const anim = spriteSet[name];
      if (!anim || !Array.isArray(anim.dur) || !anim.dur.length) return { frame: 0, t: 0 };
      let frame = Math.max(0, Math.min(anim.dur.length - 1, Number(st.frame) || 0));
      let tick = Math.max(0, Number(st.t) || 0) + Math.max(0, (Number(pose.renderAt) - Number(pose.sampleAt)) / (1000 / 60));
      let guard = 0;
      while (tick >= anim.dur[frame] && guard++ < anim.dur.length + 2) {
        tick -= anim.dur[frame];
        if (st.once && frame === anim.dur.length - 1) { tick = 0; break; }
        frame++;
        if (frame >= anim.dur.length) frame = st.once ? anim.dur.length - 1 : 0;
      }
      return { frame, t: tick };
    },
    syncTargetPose() {
      if (!this.active || !this.activeTargetId) return;
      const rec = this.remotePlayers.get(String(this.activeTargetId));
      const pose = this.samplePose(rec);
      if (!pose) return;
      T.x = pose.x; T.y = pose.y; T.row = pose.row; T.z = pose.z;
    },
    refreshPlayerCount() {
      this.peerPresent = this.remotePlayers.size > 0;
      const count = 1 + this.remotePlayers.size;
      const node = $('connectionState');
      const ping = this.latencyMs == null ? '' : ` · ping ${this.latencyMs} ms`;
      if (node && this.active) node.textContent = this.peerPresent ? `${count}/6 players connected · target: ${this.peerName || 'selecting…'}${ping}` : `Waiting for players · 1/6${ping}`;
    },
    chooseTargetForAction() {
      if (!this.active) return null;
      const candidates = Array.from(this.remotePlayers.values()).filter(r => r.state && !r.state.disconnected);
      if (!candidates.length) return null;
      const aimX = Number.isFinite(mouse.x) ? mouse.x : P.x + 80, aimY = Number.isFinite(mouse.y) ? mouse.y : P.y;
      candidates.sort((a,b) => {
        const sa = a.state, sb = b.state;
        const da = Math.hypot((Number(sa.x)||0)-aimX, (Number(sa.y)||0)-aimY) + (sa.dead ? 35 : 0);
        const db = Math.hypot((Number(sb.x)||0)-aimX, (Number(sb.y)||0)-aimY) + (sb.dead ? 35 : 0);
        return da-db;
      });
      const chosen = candidates[0];
      if (chosen && chosen.id !== this.activeTargetId) {
        this.activeTargetId = chosen.id;
        this.remoteVisuals = chosen.visuals || null;
        this.applyPeerState(chosen.state, chosen.id);
        this.peerName = chosen.name || 'Opponent';
        this.refreshPlayerCount();
      }
      return this.activeTargetId;
    },
    blocksMovement() {
      return !!this.netSlide || !!this.netHurricane || this.remaining('sleep') > 0 || this.remaining('stag') > 0 || this.remaining('root') > 0 || this.remaining('grabbed') > 0;
    },
    isSlowed() { return this.remaining('slow') > 0; },
    remaining(key) { return this.netStatus[key] ? Math.max(0, this.netStatus[key].t || 0) : 0; },
    setStatus(key, active, duration, extra) {
      if (active) this.netStatus[key] = Object.assign({ t: Math.max(0.05, Number(duration) || this.statusDefaults[key] || 1) }, extra || {});
      else delete this.netStatus[key];
    },
    targetStatus(key, value, oldValue) {
      if (!this.active || this.applyingPeerState || this.suppressDamage || value === oldValue) return;
      if (['burn', 'psn', 'sleep', 'seed', 'slow'].includes(key)) {
        if (value) this.event({ kind: 'status', key, active: true, duration: Number(value.t) || this.statusDefaults[key] });
        else if (oldValue) this.event({ kind: 'status', key, active: false });
      } else if (key === 'root' || key === 'stag') {
        if (!(Number(oldValue) > 0) && Number(value) > 0) this.event({ kind: 'status', key, active: true, duration: Number(value) });
        else if (Number(oldValue) > 0 && !(Number(value) > 0)) this.event({ kind: 'status', key, active: false });
      } else if (key === 'grabbed' && !!value !== !!oldValue) {
        this.event({ kind: 'status', key, active: !!value, duration: value ? 2 : 0 });
      } else if (key === 'wind') {
        if (value && !oldValue) this.event({ kind: Math.hypot(Number(value.vx)||0,Number(value.vy)||0)>200?'tailwind':'wind', active: true, vx: value.vx, vy: value.vy, duration: value.t || 2, bounce:3, wall:value.wallDmg||0.24 });
        else if (!value && oldValue) this.event({ kind: 'wind', active: false });
      }
    },
    makeState() {
      const pokemon = Object.keys(DEX).find(id => DEX[id] === CUR) || 'bulbasaur';
      const forcedTarget = (T.grabbed || T.wind) ? { x: T.x, y: T.y, grabbed: !!T.grabbed, wind: !!T.wind } : null;
      return {
        name: this.name,
        rtt: Number(this.latencyMs) || 90,
        pokemon,
        x: P.x, y: P.y, row: P.row, anim: P.anim, frame: P.frame, t: P.t, once: !!P.once,
        hp: P.hp, maxhp: P.maxhp, body: P.body, sh: P.sh, z: P.z || 0, hidden: !!P.hidden || !!(P.buffs && P.buffs.invis),
        types: P.types, stats: P.stats, stages: P.stages, buffs: P.buffs || {},
        dash: P.dash || null, channel: P.channel || null, curSlot: P.curSlot || null,
        locked: !!P.locked, noMove: !!P.noMove, speedMul: Number(P.speedMul) || 1, hurtT: P.hurtT || 0,
        status: Object.fromEntries(Object.entries(this.netStatus).map(([k,v]) => [k, { t: Math.max(0, Number(v && v.t) || 0) }])),
        dead: P.hp <= 0 || this.netFaintT > 0,
        netSlide: this.netSlide ? { vx: this.netSlide.vx, vy: this.netSlide.vy, t: this.netSlide.t, bounce: this.netSlide.bounce || 0, wall: this.netSlide.wall || 0, land: this.netSlide.land || 0, wind: !!this.netSlide.wind } : null,
        netHurricane: this.netHurricane ? { x: this.netHurricane.x, y: this.netHurricane.y, ang: this.netHurricane.ang, t: this.netHurricane.t } : null,
        forcedTarget
      };
    },
    sendState() {
      if (this.active) this.send({ type: 'state', state: this.makeState() });
    },
    makeVisuals() {
      // WebSocket.send serializes synchronously; deep JSON clone/parse here was
      // doubling CPU and allocation cost before every broadcast. Keep only the
      // newest effects, which are the ones visible to other players.
      const tail = (list, limit) => (Array.isArray(list) ? list.slice(-limit) : []);
      const obj = value => value || null;
      return {
        pokemon: Object.keys(DEX).find(id => DEX[id] === CUR) || 'bulbasaur',
        rtt: Number(this.latencyMs) || 90,
        effects: tail(effects, 120), projs: tail(projs, 80), parts: tail(parts, 420),
        numbers: tail(numbers, 32), orbs: tail(orbs, 24), motes: tail(motes, 48),
        fxs: tail(fxs, 48), lane: obj(lane), twisters: tail(twisters, 12),
        hurricane: obj(hurricane), combo: { n: combo.n, t: combo.t, pulse: combo.pulse },
        aim: { x: Number(mouse.x) || P.x, y: Number(mouse.y) || P.y },
        pikachu: window.PMD_PIKACHU_NET && typeof window.PMD_PIKACHU_NET.snapshot === 'function' ? window.PMD_PIKACHU_NET.snapshot() : null,
        buffs: obj(P.buffs || {}), dash: obj(P.dash), channel: obj(P.channel)
      };
    },
    sendVisuals() {
      if (!this.active) return;
      try { this.send({ type: 'visuals', visuals: this.makeVisuals() }); } catch (_) {}
    },
    applyPeerState(st, playerId) {
      if (!st || typeof st !== 'object') return;
      const remoteId = String(playerId || st.playerId || 'legacy-peer');
      this.rememberPlayer(remoteId, st.name, st);
      if (!this.activeTargetId) this.activeTargetId = remoteId;
      if (remoteId !== this.activeTargetId) return; // Keep T reserved for the chosen combat target.
      this.peerName = String(st.name || this.peerName || 'Opponent').slice(0, 20);
      this.refreshPlayerCount();
      this.peerPokemon = DEX[st.pokemon] ? st.pokemon : 'pikachu';
      this.peerPresent = true;
      if ($('hTargetLabel')) $('hTargetLabel').textContent = this.peerName;
      const id = DEX[st.pokemon] ? st.pokemon : null;
      const applySprite = () => {
        if (id && DATA[id]) {
          T.A = DATA[id];
          T._speciesId = id;
          const d = DEX[id];
          T.body = Number(st.body) || d.body || 10;
          T.sh = d.sh || 9;
        }
        this.applyingPeerState = true;
        T.x = Math.max(24, Math.min(world.w - 24, Number(st.x) || 120));
        T.y = Math.max(40, Math.min(world.h - 14, Number(st.y) || 160));
        T.row = Number(st.row) || 0;
        T.hp = Math.max(0, Number(st.hp) || 0);
        T.maxhp = Math.max(1, Number(st.maxhp) || T.maxhp || 1);
        T.types = Array.isArray(st.types) ? st.types : (id ? DEX[id].types : T.types);
        T.stats = st.stats && typeof st.stats === 'object' ? st.stats : T.stats;
        T.stages = st.stages && typeof st.stages === 'object' ? st.stages : T.stages;
        T.dead = !!st.dead;
        T.deadT = T.dead ? 999999 : 0;
        if (T.dead) { T.hidden = false; T.buffs = {}; T.dash = null; T.channel = null; if (T.slide && T.slide._mpRemote) T.slide = null; }
        if (T.slide && T.slide._mpRemote) {
          if (st.netSlide && !st.netSlide.wind) {
            T.slide._mpSeen = true;
            T.slide.t = Math.max(0, Number(st.netSlide.t) || 0);
            T.slide.bounce = Math.max(0, Number(st.netSlide.bounce) || 0);
          } else if (T.slide._mpSeen || (st.netSlide && st.netSlide.wind) || performance.now()/1000 > (T.slide._mpUntil || Infinity)) T.slide = null;
        }
        T.z = Number(st.z) || 0;
        T.hidden = !!st.hidden;
        T.buffs = st.buffs && typeof st.buffs === 'object' ? st.buffs : (T.buffs || {});
        T.dash = st.dash && typeof st.dash === 'object' ? st.dash : null;
        T.channel = st.channel && typeof st.channel === 'object' ? st.channel : null;
        T.hurtT = Math.max(0, Number(st.hurtT) || 0);
        T.kx = T.ky = 0;
        if (st.anim && T.A && T.A[st.anim]) {
          if (T.anim !== st.anim) setAnimOn(T, st.anim, st.anim === 'Faint');
          const a = T.A[T.anim];
          T.frame = Math.max(0, Math.min(a.dur.length - 1, Number(st.frame) || 0));
          T.t = Math.max(0, Number(st.t) || 0);
        } else setAnimOn(T, T.dead ? 'Faint' : 'Idle', T.dead);
        this.applyingPeerState = false;
      };
      if (id && T._speciesId !== id && !DATA[id]) {
        ensureSprites(id, true).then(ok => { if (ok) applySprite(); });
      } else applySprite();
      this.netForcedPos = st.forcedTarget && Number.isFinite(st.forcedTarget.x) && Number.isFinite(st.forcedTarget.y) ? st.forcedTarget : null;
    },
    receiveEvent(ev, fromId) {
      if (!ev || typeof ev !== 'object') return;
      if (ev.kind === 'damage') {
        if (window.IMMORTAL_MODE) { P.hp = P.maxhp; return; }
        const amount = Math.max(0, Math.round(Number(ev.amount) || 0));
        if (!amount || P.hp <= 0) return;
        // Prefer the server-committed HP value to avoid double application or
        // divergence when hit events and 40 Hz snapshots cross in flight.
        P.hp = ev.authority && Number.isFinite(Number(ev.authority.hp))
          ? Math.max(0, Math.min(P.maxhp, Number(ev.authority.hp)))
          : Math.max(0, P.hp - amount);
        P.hitFlash = 0.09;
        P.hurtT = 0.25;
        setAnimOn(P, 'Hurt', false);
        const m = ev.move && MOVES[ev.move];
        effects.push({ type: 'hit', x: P.x, y: bodyY(P), age: 0, dur: 5 * 4 * TICK, pal: PAL[m ? m.type : 'normal'] || PAL.normal, s: ev.small ? 0.55 : 0.9 });
        pop(P.x + rnd(-4, 4), P.y - (P.body + 23), amount, '#ff7a5a', true);
        if (ev.bumpX || ev.bumpY) { P.x += (Number(ev.bumpX) || 0) * 0.09; P.y += (Number(ev.bumpY) || 0) * 0.09; }
        if (P.hp <= 0) this.faintLocal('You fainted!');
      } else if (ev.kind === 'status') {
        this.setStatus(String(ev.key || ''), !!ev.active, ev.duration, ev.extra);
        if (ev.authority && ev.authority.status && typeof ev.authority.status === 'object') {
          this.netStatus = Object.fromEntries(Object.entries(ev.authority.status).filter(([k,v]) => v && Number(v.t)>0).map(([k,v]) => [k,{t:Number(v.t)}]));
        }
        if (ev.active && ['sleep', 'stag', 'grabbed'].includes(ev.key)) {
          P.dash = null; P.channel = null; P.pending = null; P.curSlot = null; P.casting = false; P.locked = false; P.jump = null; P.kb = null;
        } else if (ev.active && ev.key === 'root') {
          P.dash = null; P.jump = null; P.kb = null;
        }
      } else if (ev.kind === 'stages') {
        const stages = ev.authority && ev.authority.stages ? ev.authority.stages : ev.stages;
        if (stages) P.stages = Object.assign({ def: 0, spd: 0, spa: 0, spe: 0, atk: 0 }, P.stages || {}, stages);
      } else if (ev.kind === 'launch') {
        this.netSlide = { vx: Number(ev.vx) || 0, vy: Number(ev.vy) || 0, t: Math.max(0.05, Number(ev.duration) || 0.2), bounce: Math.max(0, Number(ev.bounce) || 0), wall: Math.max(0, Number(ev.wall) || 0), land: Math.max(0, Number(ev.land) || 0) };
        this.netStatus.root && (delete this.netStatus.root);
        P.dash = null; P.channel = null; P.locked = false;
      } else if (ev.kind === 'bump') {
        P.x += (Number(ev.vx) || 0) * 0.1;
        P.y += (Number(ev.vy) || 0) * 0.1;
      } else if (ev.kind === 'wind') {
        if (ev.active) this.netSlide = { vx: Number(ev.vx) || 0, vy: Number(ev.vy) || 0, t: Math.max(0.05, Number(ev.duration) || 2), wind: true };
        else if (this.netSlide && this.netSlide.wind) { this.netSlide = null; P.noMove=false; P.locked=false; }
      } else if (ev.kind === 'tailwind') {
        if (!ev.active) return;
        this.netSlide = { vx: Number(ev.vx) || 0, vy: Number(ev.vy) || 0, t: Math.max(0.15, Number(ev.duration) || 1.35), bounce: Math.max(0, Number(ev.bounce) || 2), wall: Math.max(0, Number(ev.wall) || 0.18), land: 0, wind: true };
        delete this.netStatus.root;
        P.dash = null; P.channel = null; P.pending = null; P.locked = false; P.noMove = true;
      } else if (ev.kind === 'hurricaneField') {
        if (ev.active) {
          this.netHurricane = Object.assign(this.netHurricane || {}, { x: Number(ev.x) || 0, y: Number(ev.y) || 0, ang: Number(ev.ang) || 0, t: Math.max(0.12, Number(ev.duration) || 0.35) });
        } else {
          const old = this.netHurricane; this.netHurricane = null;
          if (ev.release && old) {
            // Release projectiles caught by this remote Hurricane, preserving orbit
            // direction and a fraction of their original momentum.
            for (const p of projs) {
              if (!p.hurricane) continue;
              const dx=p.x-(Number(ev.x)||old.x), dy=p.y-(Number(ev.y)||old.y), L=Math.hypot(dx,dy)||1;
              const tx=-dy/L, ty=dx/L, spin=3.2+Math.min(8.5,(Number(old.age)||0)*1.25);
              const tangent=spin*Math.max(60,Number(p.hRing)||100);
              p.hurricane=false;
              p.vx=dx/L*300+tx*tangent*.62+(Number(p.hInertiaVX)||0)*.25;
              p.vy=dy/L*300+ty*tangent*.62+(Number(p.hInertiaVY)||0)*.25;
              p.life=Math.max(.85,Number(p.life)||.85); p.age=0; p.releasedByHurricane=true;
            }
          }
          if (ev.release && old && !window.IMMORTAL_MODE && P.hp > 0) {
            const dx=P.x-(Number(ev.x)||old.x), dy=bodyY(P)-(Number(ev.y)||old.y), L=Math.hypot(dx,dy)||1;
            if(L<620){ const tx=-dy/L, ty=dx/L;
              this.netSlide={vx:(dx/L*430+tx*190),vy:(dy/L*430+ty*190),t:.9,bounce:2,wall:.18,land:.03,wind:true};
              P.dash=null; P.channel=null; P.pending=null; P.locked=false; P.noMove=true; }
          }
        }
      } else if (ev.kind === 'clearTargetStatuses') {
        // This event is addressed to the player who owns the affected fighter: clear P,
        // not the attacker's local mirror T. Doing the latter left some clients stuck.
        this.netStatus = {}; this.netSlide = null; this.netForcedPos = null; this.netHurricane = null;
        P.seed = P.psn = P.sleep = P.burn = P.slow = null;
        P.root = P.stag = 0; P.grabbed = false; P.wind = null; P.slide = null;
        P.stages = { def: 0, spd: 0, spa: 0, spe: 0 };
        P.dash = null; P.channel = null; P.pending = null; P.curSlot = null;
        P.locked = false; P.noMove = false; P.casting = false;
      } else if (ev.kind === 'forceEnd') {
        this.netForcedPos = null;
      }
    },
    damageLocalPercent(pct, label, big) {
      if (P.hp <= 0 || !(pct > 0)) return;
      const amount = Math.max(1, Math.round(P.maxhp * pct));
      P.hp = Math.max(0, P.hp - amount);
      P.hitFlash = 0.09; P.hurtT = 0.25;
      effects.push({ type: 'hit', x: P.x, y: bodyY(P), age: 0, dur: 5 * 4 * TICK, pal: PAL.normal, s: big ? 1.1 : 0.8 });
      pop(P.x, P.y - (P.body + 23), amount, '#ff7a5a', true);
      if (label) logMsg(label + ' · ' + amount + ' dmg');
      if (P.hp <= 0) this.faintLocal('You fainted from knockback!');
    },
    faintLocal(message) {
      if (this.netFaintT > 0) return;
      this.netFaintT = 1.8;
      this.netFaintPos = { x: P.x, y: P.y };
      resetWing();
      this.netSlide = null; this.netHurricane = null; this.netForcedPos = null;
      P.hp = 0; P.hidden = false; P.dash = null; P.channel = null; P.pending = null; P.locked = true; P.noMove = true;
      setAnimOn(P, 'Faint', true);
      logMsg(message || 'You fainted.');
    },
    respawnLocal() {
      this.netFaintT = 0; this.netFaintPos = null; this.netSlide = null; this.netHurricane = null; this.netForcedPos = null;
      this.netStatus = {};
      P.hp = P.maxhp; P.x = rnd(55, world.w - 55); P.y = rnd(70, world.h - 32);
      P.kb = null; P.dash = null; P.channel = null; P.pending = null; P.noMove = false; P.locked = false; P.casting = false;
      P.buffs = {}; P.speedMul = 1; P.stages = { def: 0, spd: 0, spa: 0, spe: 0 };
      resetWing(); P.hidden = false; P.noMove = false; P.locked = false;
      for (const k in cd) cd[k] = 0;
      setAnimOn(P, 'Idle', false);
      logMsg('You are back in the battle!');
    },
    tick(dt) {
      if (P.hurtT > 0) P.hurtT = Math.max(0, P.hurtT - dt);
      if (this.remaining('stag') > 0) P.hurtT = Math.max(P.hurtT || 0, 0.1);
      for (const key of Object.keys(this.netStatus)) {
        this.netStatus[key].t -= dt;
        // The attacking player's mirrored target owns status expiry and will send the
        // matching clear event. Avoid echoing a local-player expiry as a new attack.
        if (this.netStatus[key].t <= 0) delete this.netStatus[key];
      }
      if (this.netHurricane) {
        const h = this.netHurricane; h.t -= dt; h.age = (Number(h.age)||0) + dt;
        if (h.t <= 0) this.netHurricane = null;
        else {
          const dx=P.x-h.x, dy=bodyY(P)-h.y, L=Math.hypot(dx,dy)||1;
          if (L<620) {
            // A broad orbit is easier to read and avoids sucking sprites into the tornado core.
            const targetR=118, radial=Math.max(-190,Math.min(260,(targetR-L)*2.4));
            const swirlX=-dy/L*205, swirlY=dx/L*205;
            const ox=P.x, oy=P.y;
            P.x += (dx/L*radial+swirlX)*dt; P.y += (dy/L*radial+swirlY)*dt;
            P.x=Math.max(24,Math.min(world.w-24,P.x)); P.y=Math.max(40,Math.min(world.h-14,P.y));
            if ((P.x===24 || P.x===world.w-24 || P.y===40 || P.y===world.h-14) && (ox!==P.x || oy!==P.y)) {
              if (h.wallTick !== true) { h.wallTick=true; this.damageLocalPercent(0.08,'Hurricane wall impact',false); }
            }
          }
        }
      }
      if (this.netSlide) {
        const sl = this.netSlide;
        const nx = P.x + sl.vx * dt, ny = P.y + sl.vy * dt;
        const cx = Math.max(24, Math.min(world.w - 24, nx));
        const cy = Math.max(40, Math.min(world.h - 14, ny));
        P.x = cx; P.y = cy;
        if (cx !== nx || cy !== ny) {
          if (sl.bounce > 0) {
            if (cx !== nx) sl.vx *= -0.48;
            if (cy !== ny) sl.vy *= -0.48;
            sl.bounce--; sl.t = Math.max(sl.t, 0.12);
            if (sl.wall > 0) this.damageLocalPercent(sl.wall, 'Wall impact', true);
          } else {
            this.netSlide = null;
            if (sl.wall > 0) this.damageLocalPercent(sl.wall, 'Wall impact', true); P.noMove=false; P.locked=false;
          }
        }
        if (this.netSlide) {
          sl.t -= dt;
          if (sl.t <= 0) { this.netSlide = null; P.noMove=false; P.locked=false; if (sl.land > 0) this.damageLocalPercent(sl.land, 'Landing', false); }
        }
      }
      if (this.netForcedPos && (this.netForcedPos.grabbed || this.netForcedPos.wind)) {
        P.x = Math.max(24, Math.min(world.w - 24, this.netForcedPos.x));
        P.y = Math.max(40, Math.min(world.h - 14, this.netForcedPos.y));
      }
      if (this.netFaintT > 0) {
        this.netFaintT -= dt;
        if (this.netFaintPos) { P.x = this.netFaintPos.x; P.y = this.netFaintPos.y; }
        P.noMove = true; P.locked = true; P.dash = null;
        if (this.netFaintT <= 0) this.respawnLocal();
      }
    },
    connect(mode, name, code) {
      if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
        try { this.socket.close(); } catch (_) {}
      }
      this.role = mode;
      this.name = String(name || '').trim().slice(0, 20);
      setStartStatus('Connecting to the room server…');
      let ws;
      try { ws = new WebSocket(this.wsUrl()); }
      catch (err) { setStartStatus('Could not open the connection. Run the included server and use its address.', true); return; }
      this.socket = ws;
      let requestSent = false;
      ws.addEventListener('open', () => {
        requestSent = true;
        ws.send(JSON.stringify(mode === 'host' ? { type: 'host', name: this.name } : { type: 'join', name: this.name, code: String(code || '').replace(/\D/g, '') }));
      });
      ws.addEventListener('message', ev => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch (_) { return; }
        if (msg.type === 'error') { setStartStatus(msg.message || 'The room request could not be completed.', true); return; }
        if (msg.type === 'serverSelfState') {
          // Apply the room server's authoritative combat ledger to our own fighter.
          // Position remains predicted locally except when the server flags a teleport
          // correction or a server-timed respawn.
          const a = msg.state;
          if (a && typeof a === 'object' && this.active) {
            const authHp = Number(a.hp), authMax = Number(a.maxhp);
            if (Number.isFinite(authMax) && authMax > 0) P.maxhp = authMax;
            if (Number.isFinite(authHp)) P.hp = Math.max(0, Math.min(P.maxhp, authHp));
            if (a.status && typeof a.status === 'object') this.netStatus = Object.fromEntries(Object.entries(a.status).filter(([k,v]) => v && Number(v.t)>0).map(([k,v]) => [k,{t:Number(v.t)}]));
            if (a.stages && typeof a.stages === 'object') P.stages = Object.assign({def:0,spd:0,spa:0,spe:0,atk:0}, a.stages);
            if (a.dead && P.hp <= 0) this.faintLocal('You fainted!');
            if (a.respawn && !a.dead) {
              this.respawnLocal();
              if (Number.isFinite(a.x)) P.x = Math.max(24, Math.min(world.w-24, a.x));
              if (Number.isFinite(a.y)) P.y = Math.max(40, Math.min(world.h-14, a.y));
              P.hp = Number.isFinite(authHp) ? authHp : P.maxhp;
            } else if (a.corrected) {
              if (Number.isFinite(a.x)) P.x = Math.max(24, Math.min(world.w-24, a.x));
              if (Number.isFinite(a.y)) P.y = Math.max(40, Math.min(world.h-14, a.y));
            }
          }
          return;
        }
        if (msg.type === 'pong') {
          const sentAt = Number(msg.sentAt);
          if (Number.isFinite(sentAt) && sentAt > 0) { const measured = Math.max(0, Math.round(performance.now() - sentAt)); this.latencySamples.push(measured); if (this.latencySamples.length > 5) this.latencySamples.shift(); const sorted = this.latencySamples.slice().sort((a,b)=>a-b); const stable = sorted[Math.floor(sorted.length/2)]; this.latencyMs = this.latencyMs == null ? stable : Math.round(this.latencyMs * 0.65 + stable * 0.35); this.refreshPlayerCount(); }
          return;
        }
        if (msg.type === 'hosted' || msg.type === 'joined') {
          this.code = String(msg.code || ''); this.id = String(msg.id || msg.playerId || '');
          this.active = true; this.remotePlayers = new Map(); this.activeTargetId = null; this.peerName = '';
          for (const player of (Array.isArray(msg.players) ? msg.players : [])) this.rememberPlayer(player.id, player.name);
          this.netStatus = {}; this.netSlide = null; this.netForcedPos = null;
          this.enterGame(); this.refreshPlayerCount(); this.sendState();
        } else if (msg.type === 'playerJoined') {
          const player = msg.player || { id: msg.playerId, name: msg.name };
          this.rememberPlayer(player.id, player.name);
          logMsg((player.name || 'A player') + ' joined the arena.');
        } else if (msg.type === 'peerState') {
          const remoteId = String(msg.playerId || (msg.state && msg.state.playerId) || 'legacy-peer');
          this.rememberPlayer(remoteId, msg.state && msg.state.name, msg.state);
          if (!this.activeTargetId) this.activeTargetId = remoteId;
          if (remoteId === this.activeTargetId) this.applyPeerState(msg.state, remoteId);
        } else if (msg.type === 'peerEvent') {
          // Most combat events target one player's own fighter. Arena-wide fields
          // (Tailwind/Hurricane) deliberately address every other room member.
          if (String(msg.targetId || '') === this.id || String(msg.targetId || '') === '*') this.receiveEvent(msg.event, msg.playerId);
        } else if (msg.type === 'peerVisuals') {
          const remoteId = String(msg.playerId || 'legacy-peer');
          const visuals = msg.visuals && typeof msg.visuals === 'object' ? msg.visuals : null;
          const rec = this.rememberPlayer(remoteId, null, null, visuals);
          if (remoteId === this.activeTargetId) this.remoteVisuals = visuals;
        } else if (msg.type === 'playerLeft') {
          const leftId = String(msg.playerId || ''); const old = this.remotePlayers.get(leftId);
          this.remotePlayers.delete(leftId);
          if (leftId === this.activeTargetId) {
            this.activeTargetId = null; this.remoteVisuals = null; this.peerName = '';
            const next = Array.from(this.remotePlayers.values()).find(r => r.state);
            if (next) { this.activeTargetId = next.id; this.peerName = next.name; this.applyPeerState(next.state, next.id); }
            else { this.applyingPeerState = true; T.dead = true; T.deadT = 999999; T.slide = null; T.grabbed = false; T.wind = null; T.seed = T.psn = T.sleep = T.burn = T.slow = null; T.root = T.stag = 0; T.hidden = false; T.buffs = {}; T.dash = null; T.channel = null; this.applyingPeerState = false; }
          }
          this.refreshPlayerCount(); logMsg((old && old.name || 'A player') + ' left the arena.');
        } else if (msg.type === 'peerLeft') {
          // Compatibility with rooms served by the previous two-player server.
          const leftId = this.activeTargetId; if (leftId) this.remotePlayers.delete(leftId);
          this.activeTargetId = null; this.remoteVisuals = null; this.peerName = ''; this.refreshPlayerCount();
          this.applyingPeerState = true; T.dead = true; T.deadT = 999999; T.slide = null; T.grabbed = false; T.wind = null; this.applyingPeerState = false;
        } else if (msg.type === 'roomClosed') {
          this.peerPresent = false; this.remotePlayers.clear(); this.activeTargetId = null;
          const node = $('connectionState'); if (node) node.textContent = 'Room closed';
          setStartStatus('The host closed the room. Refresh to host or join again.', true);
        }
      });
      ws.addEventListener('close', () => {
        if (!this.active) setStartStatus('Connection closed. Check the server address and firewall, then try again.', true);
        else {
          this.peerPresent = false;
          $('connectionState').textContent = 'Disconnected';
        }
      });
      ws.addEventListener('error', () => {
        if (!requestSent) setStartStatus('Could not reach the room server. Start server.js and check the IP/port.', true);
      });
    },
    enterGame() {
      $('startScreen').hidden = true;
      $('gameView').hidden = false;
      document.body.classList.add('mp-live');
      $('roomCodeDisplay').textContent = this.code || '------';
      $('connectionState').textContent = this.role === 'host' ? 'Waiting for players · 1/6' : 'Connecting to room…';
      if ($('hTargetLabel')) $('hTargetLabel').textContent = this.peerName || 'Opponent';
      if ($('btnReset')) $('btnReset').textContent = 'Reset my fighter';
      // The former AI checkbox was removed from the UI; don't dereference it here.
      const aiControl = $('ai'); if (aiControl) { aiControl.checked = false; aiControl.disabled = true; }
      this.applyingPeerState = true;
      T.dead = true; T.deadT = 999999; T.hp = T.maxhp; T.x = world.w * 0.72; T.y = world.h * 0.57;
      this.applyingPeerState = false;
      if (this.role === 'guest') { P.x = rnd(55, world.w - 55); P.y = rnd(65, world.h - 25); }
      P.hp = P.maxhp;
      window.focus(); cv.focus();
      logMsg(this.role === 'host' ? 'You are hosting. Share the numeric code for up to five friends to join.' : 'Joined the room. Choose your Pokémon and battle!');
    }
  };

  window.PMD_MP = MP;

  function setStartStatus(message, error) {
    const node = $('startStatus');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('error', !!error);
    node.classList.toggle('success', !error && /ready|hosted|joined/i.test(message));
  }

  function sanitizeName() { return String($('playerName').value || '').trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, 20); }
  function validateName() {
    const name = sanitizeName();
    if (!name) { setStartStatus('Enter a name first, then host or join.', true); $('playerName').focus(); return null; }
    $('playerName').value = name;
    return name;
  }
  $('btnHost').addEventListener('click', () => {
    const name = validateName(); if (!name) return;
    MP.connect('host', name, '');
  });
  $('btnJoin').addEventListener('click', () => {
    const name = validateName(); if (!name) return;
    const code = String($('joinCode').value || '').replace(/\D/g, '').slice(0, 8);
    if (!code) { setStartStatus('Enter the numeric room code your friend shared.', true); $('joinCode').focus(); return; }
    MP.connect('join', name, code);
  });
  $('joinCode').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8); });
  $('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('btnJoin').click(); });
  $('playerName').addEventListener('keydown', e => { if (e.key === 'Enter') $('btnHost').click(); });
  $('btnCopyCode').addEventListener('click', () => {
    if (!MP.code) return;
    const done = () => { $('btnCopyCode').textContent = 'Copied'; setTimeout(() => $('btnCopyCode').textContent = 'Copy', 1200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(MP.code).then(done).catch(() => {});
    else {
      const tmpInput = document.createElement('textarea'); tmpInput.value = MP.code; tmpInput.style.position = 'fixed'; tmpInput.style.opacity = '0';
      document.body.appendChild(tmpInput); tmpInput.select();
      try { if (document.execCommand('copy')) done(); } catch (_) {}
      tmpInput.remove();
    }
  });

  // Make every target HP decrement, including move-specific and damage-over-time effects,
  // reach the owning player's local HP. Peer snapshots are explicitly suppressed.
  let targetHp = T.hp;
  Object.defineProperty(T, 'hp', {
    configurable: true, enumerable: true,
    get() { return targetHp; },
    set(next) {
      const old = targetHp;
      const value = Number(next);
      targetHp = Number.isFinite(value) ? value : old;
      if (targetHp < old && MP.active && MP.peerPresent && !MP.applyingPeerState && !MP.suppressDamage) {
        MP.event({ kind: 'damage', amount: Math.round(old - targetHp), move: MP.hitContext && MP.hitContext.move, small: !!(MP.hitContext && MP.hitContext.small) });
      }
    }
  });

  // Make target status assignments observable without modifying individual attack scripts.
  for (const key of ['burn', 'psn', 'sleep', 'seed', 'slow', 'root', 'stag', 'grabbed', 'wind']) {
    let value = T[key];
    Object.defineProperty(T, key, {
      configurable: true, enumerable: true,
      get() { return value; },
      set(next) { const old = value; value = next; MP.targetStatus(key, next, old); }
    });
  }

  const originalStrike = strike;
  strike = function (moveKey, mult, fromX, fromY, ex, ey, options) {
    const oldKx = T.kx, oldKy = T.ky;
    const previous = MP.hitContext;
    MP.hitContext = { move: moveKey, small: !!(options && options.small), fromX: Number(fromX), fromY: Number(fromY), targetX: Number(ex), targetY: Number(ey), mult: Number(mult) || 1 };
    const result = originalStrike(moveKey, mult, fromX, fromY, ex, ey, options);
    MP.hitContext = previous;
    const bumpX = T.kx - oldKx, bumpY = T.ky - oldKy;
    if ((bumpX || bumpY) && MP.active && MP.peerPresent) { MP.event({ kind: 'bump', vx: bumpX, vy: bumpY }); T.kx = T.ky = 0; }
    return result;
  };

  const originalLaunchTarget = launchTarget;
  launchTarget = function (vx, vy, duration, wall, land) {
    originalLaunchTarget(vx, vy, duration, wall, land);
    if (T.slide) { T.slide._mpRemote = true; T.slide._mpSeen = false; T.slide._mpUntil = performance.now()/1000 + Math.max(0.05, Number(duration) || 0.2) + 0.3; }
    const sendLaunch = () => MP.event({ kind: 'launch', vx, vy, duration, wall, land, bounce: T.slide ? (Number(T.slide.bounce) || 0) : 0 });
    if (typeof queueMicrotask === 'function') queueMicrotask(sendLaunch); else setTimeout(sendLaunch, 0);
  };

  const originalAddStages = addStages;
  addStages = function (entity, stages) {
    originalAddStages(entity, stages);
    if (entity === T && MP.active && MP.peerPresent) MP.event({ kind: 'stages', stages: Object.assign({}, T.stages) });
  };

  const originalHurtPlayer = hurtPlayer;
  hurtPlayer = function (raw) {
    if (!MP.active) return originalHurtPlayer(raw);
    const damage = Math.max(1, Math.round(raw * (P.buffs.iron ? 0.5 : 1) / stageMult(P.stages.def)));
    P.hp = Math.max(0, P.hp - damage);
    pop(P.x, P.y - (P.body + 23), '-' + damage, '#ff6a5a', true);
    shakeT = 0.12; shakeMag = 1;
    if (P.hp <= 0) MP.faintLocal('You fainted from recoil!');
  };

  const originalDoAction = doAction;
  doAction = function (slot) {
    if (MP.active && (P.hp <= 0 || MP.netSlide || MP.remaining('sleep') > 0 || MP.remaining('stag') > 0 || MP.remaining('grabbed') > 0)) return;
    if (MP.active) MP.chooseTargetForAction();
    return originalDoAction(slot);
  };

  const originalResetFight = resetFight;
  resetFight = function () {
    originalResetFight();
    if (MP.active) {
      MP.netStatus = {}; MP.netSlide = null; MP.netForcedPos = null; MP.netFaintT = 0; MP.netFaintPos = null;
      P.hidden = false; P.noMove = false; P.locked = false; P.pending = null;
      MP.event({ kind: 'clearTargetStatuses' }); MP.sendState();
    }
  };

  const originalSetPokemon = setPokemon;
  setPokemon = function (id) {
    originalSetPokemon(id);
    if (MP.active) MP.sendState();
  };

  const originalUpdate = update;
  update = function (dt) {
    if (MP.active) MP.tick(dt);
    const result = originalUpdate(dt);
    if (MP.active && MP.netFaintT > 0 && MP.netFaintPos) {
      P.x = MP.netFaintPos.x; P.y = MP.netFaintPos.y; P.noMove = true; P.locked = true; P.dash = null; P.channel = null;
      if (P.anim !== 'Faint') { setAnimOn(P, 'Faint', true); const a = P.A.Faint; if (a) { P.frame = a.dur.length - 1; P.t = 0; } }
    }
    return result;
  };

  const originalDraw = draw;
  function nameTag(x, y, text, self) {
    if (!text) return;
    const label = String(text).slice(0, 20);
    ctx.save();
    ctx.font = 'bold 12px "Trebuchet MS", Segoe UI, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(label).width + 14;
    const xx = Math.round(x * S), yy = Math.round(y * S);
    ctx.fillStyle = self ? 'rgba(24,48,25,.92)' : 'rgba(25,31,26,.92)';
    ctx.strokeStyle = self ? 'rgba(111,214,104,.9)' : 'rgba(225,235,221,.62)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(xx - w/2, yy - 9, w, 18, 5); else ctx.rect(xx - w/2, yy - 9, w, 18);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(label, xx, yy + 0.5);
    ctx.restore();
  }
  function drawRemoteHeldStream(channel, aim, x, y, body, dex) {
    if (!channel || !aim || !dex || !dex.slots) return;
    const slot = dex.slots[channel.slot]; if (!slot || !slot.move) return;
    const move = slot.move, hydro = channel.kind === 'hydroTwin' && move === 'hydropump';
    const isFire = move === 'flamethrower', isDragon = move === 'dragonbreath', isBubble = move === 'bubblebeam';
    if (!hydro && channel.kind !== 'stream') return; if (!hydro && !isFire && !isDragon && !isBubble) return;
    const ox=x, oy=y-(Number(body)||10)-2, dx=Number(aim.x)-ox, dy=Number(aim.y)-oy, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L;
    const range=hydro?500:(Number(slot.p && slot.p.range)|| (isBubble?260:isDragon?330:300)), maxLen=hydro?Math.min(500,Math.max(0,Number(channel.t)||0)*220):range, len=clipLen(ox,oy,ux,uy,maxLen), half=isBubble?4:isDragon?18:hydro?6:10;
    ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
    if(hydro){ for(const off of [-6,6]){ctx.globalAlpha=.8;ctx.strokeStyle='#176da8';ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(ox-uy*off,oy+ux*off);ctx.lineTo(ox+ux*len-uy*off,oy+uy*len+ux*off);ctx.stroke();ctx.strokeStyle='#c6f6ff';ctx.lineWidth=3;ctx.stroke();} } else if(isBubble){ for(let i=0;i<18;i++){const t=(i/18)*len, off=Math.sin(performance.now()/95+i*1.8)*half;ctx.globalAlpha=.65;ctx.fillStyle='#b9f5ff';ctx.beginPath();ctx.arc(ox+ux*t-uy*off,oy+uy*t+ux*off,1.5+(i%3)*.45,0,Math.PI*2);ctx.fill();} }
    else {
      // Render a breath-shaped particle cone, never a synthetic straight laser.
      const base=isDragon?'#9c79e8':'#ff7026', core=isDragon?'#eadbff':'#fff4bd';
      const now=Math.floor(performance.now()/45);
      for(let i=0;i<54;i++){
        const seed=(i*37+now*13)%997, t=((i*29)%53)/53;
        const side=((seed%101)/100-.5)*2, wob=Math.sin(now*.7+i*1.73)*.08;
        const dist=(.08+t*.92)*len, spread=(isDragon?half:half)*(.15+t*.85);
        const lateral=(side*spread+wob*half)*Math.sqrt(t);
        const px=ox+ux*dist-uy*lateral, py=oy+uy*dist+ux*lateral;
        const size=1+(i%4===0?1:0);
        ctx.globalAlpha=.38+(i%5)*.1; ctx.fillStyle=isDragon?(i%3===0?core:base):(i%4===0?'#fff4bd':base);
        ctx.fillRect(Math.round(px),Math.round(py),size,size);
      }
    }
    ctx.restore();
  }
  function drawRemoteVisualsFor(rec) {
    const v = rec && rec.visuals;
    if (!v || !MP.active) return;
    const pose = MP.samplePose(rec), st = (pose && pose.state) || rec.state || {};
    const rx = pose ? pose.x : (Number(st.x) || 0), ry = pose ? pose.y : (Number(st.y) || 0);
    const visualTransitMs = Math.max(0, Math.min(180, ((Number(MP.latencyMs) || 90) + (Number(v.rtt) || 90)) * 0.5));
    const visualAge = Math.max(0, Math.min(0.18, (performance.now() - (rec.visualsReceivedAt || performance.now()) + visualTransitMs) / 1000));
    const fresh = item => { if (!item || typeof item !== 'object') return item; const q = Object.assign({}, item); if (Number.isFinite(Number(q.age))) q.age = Number(q.age) + visualAge; if (q.type !== 'mleaf' || q.state !== 'hover') { if (Number.isFinite(Number(q.x)) && Number.isFinite(Number(q.vx))) q.x += Number(q.vx) * visualAge; if (Number.isFinite(Number(q.y)) && Number.isFinite(Number(q.vy))) q.y += Number(q.vy) * visualAge; } return q; };
    ctx.save(); ctx.setTransform(S, 0, 0, S, 0, 0);
    for (const raw of (v.effects || [])) { const e = fresh(raw);
      // Snapshot packets can arrive just as a local effect expires. Do not render
      // expired remnants on remote clients (the tiny dots seen after breath ends).
      if (Number.isFinite(Number(e.dur)) && Number.isFinite(Number(e.age)) && e.age > e.dur) continue;
      if (e.type === 'hit') drawHit(e); else if (e.type === 'vines') drawVines(e);
      else if (e.type === 'bubble') drawBubble(e); else if (e.type === 'heal') drawHeal(e); else if (e.type === 'zzz') drawZzz(e);
      else if (e.type === 'dust') drawDust(e); else if (e.type === 'sparkle') drawSparkle(e); else if (e.type === 'ring2') drawRing2(e); else if (e.type === 'wave') drawWave(e);
      else if (e.type === 'melee') drawMelee(e); else if (e.type === 'smoke') drawSmoke(e); else if (e.type === 'liq') drawLiq(e); else if (e.type === 'flamelet') drawFlamelet(e); else if (e.type === 'laser') drawLaser(e); else if (e.type === 'wind') drawWind(e);
    }
    for (const raw of (v.parts || [])) drawPowder(fresh(raw));
    for (const raw of (v.projs || [])) { const p = fresh(raw); if (p.type === 'seed') drawSeed(p); else if (p.type === 'proj') drawProj(p); else drawLeaf(p); }
    for (const raw of (v.orbs || [])) drawOrb(fresh(raw));
    // Render Pokémon-specific effects in an isolated snapshot context for EACH remote player.
    const saved = {
      CUR, lane, hurricane, combo: { n: combo.n, t: combo.t, pulse: combo.pulse },
      fxs: fxs.slice(), twisters: twisters.slice(),
      P: { x:P.x, y:P.y, body:P.body, row:P.row, buffs:P.buffs, dash:P.dash, channel:P.channel },
      mx: mouse.x, my: mouse.y
    };
    try {
      const pid = DEX[v.pokemon] ? v.pokemon : (DEX[st.pokemon] ? st.pokemon : null);
      if (pid) CUR = DEX[pid];
      lane = v.lane ? fresh(v.lane) : null;
      hurricane = v.hurricane ? fresh(v.hurricane) : null;
      twisters.splice(0, twisters.length, ...(v.twisters || []).map(fresh));
      fxs.splice(0, fxs.length, ...(v.fxs || []).map(fresh));
      const remoteCombo = { n: Number(v.combo && v.combo.n) || 0, t: Number(v.combo && v.combo.t) || 0, pulse: Number(v.combo && v.combo.pulse) || 0 };
      combo.n = 0; combo.t = 0; combo.pulse = 0;
      P.x = rx; P.y = ry; P.body = Number(st.body) || 10; P.row = Number(st.row) || 0;
      P.buffs = v.buffs || st.buffs || {}; P.dash = v.dash || st.dash || null; P.channel = v.channel || st.channel || null;
      if (v.aim && Number.isFinite(v.aim.x) && Number.isFinite(v.aim.y)) { mouse.x = v.aim.x; mouse.y = v.aim.y; }
      else { const rowAngle = ((90 - P.row * 45) * Math.PI) / 180; mouse.x = P.x + Math.cos(rowAngle) * 100; mouse.y = P.y + Math.sin(rowAngle) * 100; }

      // Sustained Dragon Breath / Flamethrower streams are not ordinary projectile
      // entities. Their caster-side particles are transient and can be missed between
      // snapshots, so render a matching remote breath plume from the synchronized
      // channel + aim. This deliberately uses the breath renderer (not drawLaser).
      // Dragon Breath and Flamethrower already synchronize their actual caster-side
      // particles through v.parts. Do not add a second synthetic cone here: it leaves
      // stray pixels beyond the caster's real effect and makes remote visuals longer.
      // The held-stream fallback remains available for other stream-style moves.
      const remoteStreamSlot = P.channel && CUR && CUR.slots && CUR.slots[P.channel.slot];
      if (remoteStreamSlot && remoteStreamSlot.move !== 'dragonbreath' && remoteStreamSlot.move !== 'flamethrower') {
        drawRemoteHeldStream(P.channel, v.aim, rx, ry, P.body, CUR);
      }

      drawFlying();
      if (remoteCombo.t > 0 && remoteCombo.n >= 2) {
        ctx.save(); ctx.textAlign = 'center'; ctx.font = 'bold 8px monospace'; ctx.lineWidth = 2; ctx.strokeStyle = '#241a5a'; ctx.fillStyle = remoteCombo.n >= 10 ? '#ff7a3a' : '#ffd23a';
        const label = remoteCombo.n + ' HITS', yy = ry - P.body - 27; ctx.strokeText(label, rx, yy); ctx.fillText(label, rx, yy); ctx.restore();
      }
      // Do not synthesize a generic laser for remote sustained attacks.
      // The caster's actual particles/projectiles are replayed from v.effects/v.parts/v.projs.
      // Generic drawSolar/drawLaserCharge on every channel was the source of the purple
      // Dragon Breath and misplaced Flamethrower/Hydro Pump laser overlays.
      if (P.channel && (P.channel.kind === 'solar' || P.channel.move === 'solarbeam')) drawSolar();
      if (P.channel && P.channel.kind === 'charge') drawLaserCharge();
      drawPlayerFx();
      if (v.pikachu && window.PMD_PIKACHU_NET && typeof window.PMD_PIKACHU_NET.drawRemote === 'function') {
        window.PMD_PIKACHU_NET.drawRemote(v.pikachu, rx, ry, P.body);
      }
      for (const raw of (v.motes || [])) { const m = fresh(raw);
        const u = Math.max(0, Math.min(1, m.age / (m.life || 1))), tx = rx, ty = ry - P.body - 4;
        const x = m.sx + (tx - m.sx) * u, y = m.sy + (ty - m.sy) * u;
        ctx.fillStyle = u < 0.7 ? '#e4ff9a' : '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
    } catch (_) {} finally {
      CUR = saved.CUR; lane = saved.lane; hurricane = saved.hurricane;
      twisters.splice(0, twisters.length, ...saved.twisters); fxs.splice(0, fxs.length, ...saved.fxs);
      combo.n = saved.combo.n; combo.t = saved.combo.t; combo.pulse = saved.combo.pulse;
      P.x = saved.P.x; P.y = saved.P.y; P.body = saved.P.body; P.row = saved.P.row; P.buffs = saved.P.buffs; P.dash = saved.P.dash; P.channel = saved.P.channel;
      mouse.x = saved.mx; mouse.y = saved.my; ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const n of (v.numbers || [])) {
      ctx.font = 'bold ' + Math.round((n.big ? 5.4 : 4.4) * S) + 'px ui-monospace,Menlo,Consolas,monospace';
      ctx.textAlign = 'center'; ctx.globalAlpha = Math.min(1, (0.9 - n.age) / 0.3);
      const x = n.x * S, y = (n.y - n.age * 24) * S;
      ctx.lineWidth = 4; ctx.strokeStyle = '#10130f'; ctx.strokeText(n.txt, x, y); ctx.fillStyle = n.col; ctx.fillText(n.txt, x, y);
    }
    ctx.globalAlpha = 1;
  }
  function drawOtherPlayers() {
    if (!MP.active || MP.remotePlayers.size <= 1) return;
    const drawn = [];
    ctx.save(); ctx.setTransform(S,0,0,S,0,0);
    for (const rec of MP.remotePlayers.values()) {
      if (!rec.state || rec.id === MP.activeTargetId) continue;
      const pose = MP.samplePose(rec), st = (pose && pose.state) || rec.state;
      const id = String(st.pokemon || rec.state.pokemon || '');
      if (!DATA[id]) {
        if (!rec.loading && DEX[id]) { rec.loading = true; ensureSprites(id, true).then(ok => { rec.loading = false; if (ok) DATA[id] = SPRITES[id]; }); }
        continue;
      }
      const set = DATA[id], animName = st.anim && set[st.anim] ? st.anim : 'Idle', a = set[animName];
      if (!a || !a.image || !a.image.complete) continue;
      const animPose = MP.animationPose(rec, pose, set);
      const frame = Math.max(0, Math.min(a.dur.length-1, animPose.frame));
      const ent = { A:set, x:pose ? pose.x : (Number(st.x)||0), y:pose ? pose.y : (Number(st.y)||0), body:Number(st.body)||10, sh:Number(st.sh)||8, z:pose ? pose.z : (Number(st.z)||0), row:Math.max(0,Number(st.row)||0), anim:animName, frame, t:animPose.t };
      drawEnt(ent, {alpha:st.dead?0.45:(st.hidden?0.16:1), flash:false});
      // Smoke Screen hides the health bar and status chips as well as fading the sprite.
      if (!st.dead && !st.hidden) {
        const w=28,x=ent.x-w/2,y=ent.y-38; ctx.fillStyle='#14171a';ctx.fillRect(x-1,y-1,w+2,5);ctx.fillStyle='#3a1f1f';ctx.fillRect(x,y,w,3);ctx.fillStyle=(Number(st.hp)/Math.max(1,Number(st.maxhp)||1))>.3?'#58d65b':'#e0503c';ctx.fillRect(x,y,w*Math.max(0,Math.min(1,Number(st.hp)/Math.max(1,Number(st.maxhp)||1))),3);
        const colors={sleep:'#d8d84a',psn:'#9b4ad6',burn:'#ff8a2a',seed:'#58c24a',slow:'#3f8bff',root:'#b2a58d',stag:'#d46c52',grabbed:'#7b8e9b'};
        let si=0; for (const [key, val] of Object.entries(st.status || {})) { if (Number(val && val.t)>0 && colors[key]) { ctx.fillStyle=colors[key]; ctx.fillRect(x+si*5,y+5,4,2); si++; } }
      }
      if (!st.hidden) drawn.push({x:ent.x,y:ent.y,body:ent.body,name:rec.name});
    }
    ctx.restore(); ctx.setTransform(1,0,0,1,0,0);
    for (const d of drawn) nameTag(d.x,d.y-d.body-15,d.name,false);
  }
  function drawLocalStatus() {
    if (!MP.active || !Object.keys(MP.netStatus).length) return;
    const labels = { seed:['SEED','#58c24a'], psn:['PSN','#9b4ad6'], sleep:['SLP','#b9b229'], burn:['BRN','#e0601a'], slow:['SLW','#3a9fd0'], root:['ROOT','#b2a58d'], stag:['STUN','#d46c52'], grabbed:['GRAB','#7b8e9b'] };
    const chips = Object.keys(MP.netStatus).filter(k => MP.remaining(k) > 0 && labels[k]).map(k => labels[k]);
    if (!chips.length) return;
    ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.textAlign = 'center'; ctx.font = 'bold ' + Math.round(3.3*S) + 'px ui-monospace,Menlo,Consolas,monospace';
    const width = 12*S, total = chips.length*width, start = P.x*S-total/2+width/2, y = (P.y-P.body-42)*S;
    for (let i=0;i<chips.length;i++) { const x=start+i*width; ctx.fillStyle=chips[i][1]; ctx.fillRect(x-width/2,y,width-2*S,5*S); ctx.fillStyle='#fff'; ctx.fillText(chips[i][0],x,y+4*S); }
    ctx.restore();
  }
  draw = function () {
    const targetRec = MP.active ? MP.remotePlayers.get(String(MP.activeTargetId || '')) : null;
    const targetPose = MP.samplePose(targetRec);
    const savedT = { x:T.x, y:T.y, row:T.row, z:T.z, frame:T.frame, t:T.t, anim:T.anim, once:T.once, hidden:T.hidden };
    if (targetPose) {
      T.x = targetPose.x; T.y = targetPose.y; T.row = targetPose.row; T.z = targetPose.z;
      const st = targetPose.state;
      if (st && st.anim && T.A && T.A[st.anim]) T.anim = st.anim;
      if (st) { const ap = MP.animationPose(targetRec, targetPose, T.A); T.frame = Math.max(0, Math.min((T.A[T.anim] && T.A[T.anim].dur.length || 1)-1, ap.frame)); T.t = ap.t; T.hidden = !!st.hidden; }
    }
    originalDraw();
    T.x = savedT.x; T.y = savedT.y; T.row = savedT.row; T.z = savedT.z; T.frame = savedT.frame; T.t = savedT.t; T.anim = savedT.anim; T.once = savedT.once; T.hidden = savedT.hidden;
    // Projectiles, beams, combo counters and hit effects are rendered for every remote player,
    // not just the currently selected target.
    if (MP.active) for (const rec of MP.remotePlayers.values()) drawRemoteVisualsFor(rec);
    drawOtherPlayers();
    nameTag(P.x, P.y - P.body - 15, MP.name || 'You', true);
    if (MP.active && targetRec && targetRec.state && !targetRec.state.hidden) {
      const pose = targetPose || { x:T.x, y:T.y, state:targetRec.state };
      nameTag(pose.x, pose.y - (Number(pose.state.body)||T.body) - 15, targetRec.name || 'Opponent', false);
    }
    drawLocalStatus();
  };

  // 40 Hz state + 30 Hz visuals: frequent enough for combat, without flooding six-player rooms.
  // Remote poses are predicted forward from measured transit time and smoothed between snapshots.
  setInterval(() => { if (MP.active) MP.sendState(); }, 25);
  setInterval(() => { if (MP.active) MP.sendVisuals(); }, 25);
  setInterval(() => { if (MP.active) MP.send({ type: 'ping', sentAt: performance.now() }); }, 1000);
})();
