function escapeMoveText(v){ return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function defaultMoveDescription(slot, move){
  if(slot.channel && slot.hold) return `Hold ${slot.label} to sustain ${move.name} for up to ${slot.maxHold||3} seconds. Release to stop.`;
  if(slot.kind==='dashhit') return `Dash toward the cursor and damage opponents you contact. ${move.name} is a ${move.cat||'status'} ${move.type||'normal'}-type move.`;
  if(slot.kind==='proj') return `Fire ${move.name} toward the cursor.`;
  if(slot.kind==='buff') return `Activate ${move.name} to gain its listed status effect.`;
  return `${move.name}: ${move.cat||'status'} move of the ${move.type||'normal'} element.`;
}
// ---------------- UI setup ----------------
function renderPokemonUI(){
  $('pSwitch').innerHTML = Object.entries(DEX).map(([id,d])=>`<button class="pt ${d===CUR?'on':''}" data-id="${id}" title="${d.name}"><img alt="" loading="lazy" src="${PORTRAIT}${String(d.num).padStart(4,'0')}/Normal.png" onerror="this.style.opacity=0"><span>${d.name}</span></button>`).join('');
  $('pName').textContent = CUR.name + '  Lv. ' + LEVEL;
  $('pTypes').innerHTML = CUR.types.map(chip).join('');
  const labels = [['hp','HP'],['atk','Attack'],['def','Defense'],['spa','Sp. Atk'],['spd','Sp. Def'],['spe','Speed']];
  $('pStats').innerHTML = labels.map(([k,l])=>`<div class="stat"><span>${l}</span><b>${CUR.base[k]}</b><div class="track"><i style="width:${Math.min(100,CUR.base[k]/1.6)}%"></i></div><b title="Level ${LEVEL} stat">${P.stats[k]}</b></div>`).join('')
    + `<div class="note">Left number: base stat. Right number: level ${LEVEL} stat (31 IV, no EVs, neutral nature).</div>`;
  const weak = [], res = [];
  for (const t of TYPES){ const m = typeMult(t, CUR.types); if (m>1) weak.push(cap(t)+' '+fmtMult(m)); else if (m<1) res.push(cap(t)+' '+fmtMult(m)); }
  $('pDef').innerHTML = '<b>Weak to:</b> '+weak.join(', ')+'<br><b>Resists:</b> '+res.join(', ');
  $('moveList').innerHTML = ['click','rmb','Q','E'].filter(k=>SLOTS[k]).map(k=>{
    const slot=SLOTS[k], m=MOVES[slot.move] || {name:slot.move||'Move',type:'normal',cat:'status'};
    const cat = cap(m.cat || 'status'), element = cap(m.type || 'normal');
    const desc = slot.desc || m.desc || defaultMoveDescription(slot, m);
    const cdText = (Number(slot.cd)||0).toFixed((Number(slot.cd)||0)%1 ? 1 : 0);
    return `<button type="button" class="move-button" data-slot="${k}" title="${escapeMoveText(desc)}"><span class="move-key">${slot.label}</span><span><span class="move-title">${m.name}</span><br><span class="move-meta">${cat} · ${element} · CD ${cdText}s</span><span class="move-desc">${escapeMoveText(desc)}</span></span><span class="cooldown-cover" hidden></span></button>`;
  }).join('') + `<div class="note">WASD: Move · Space: Dodge · Shift: Dash · Hold channel moves for up to their listed duration.</div>`;

}
function setPokemon(id){
  CUR = DEX[id]; SLOTS = CUR.slots;
  P.A = DATA[id]; P.sh = CUR.sh || 9; P.types = CUR.types; P.stats = calcStats(CUR.base); P.maxhp = P.stats.hp; P.speed = 38+CUR.base.spe*0.55; P.body = CUR.body;
  resetFight(); renderPokemonUI();
}
(function(){
  $('pSwitch').onclick = e => { const bt = e.target.closest && e.target.closest('button'), id = bt && bt.dataset.id; if (id && DEX[id]!==CUR) ensureSprites(id).then(ok=>{ if (ok) setPokemon(id); }); };
  const dsel = $('dType');
  const opts = TYPES.map(t=>[t,cap(t)]).concat([['water,ground','Water / Ground (4× to Grass)'],['fire,flying','Fire / Flying'],['grass,poison','Grass / Poison (like Bulbasaur)'],['steel,flying','Steel / Flying']]);
  dsel.innerHTML = opts.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  dsel.value = 'water';
  function dummyInfo(){
    const g = typeMult('grass', T.types), p = typeMult('poison', T.types);
    const seedImm = T.types.includes('grass'), psnImm = T.types.some(t=>['grass','poison','steel'].includes(t));
    $('dInfo').innerHTML = T.types.map(chip).join('')+'<br>Grass moves: <b>'+fmtMult(g)+'</b> · Poison moves: <b>'+fmtMult(p)+'</b><br>Leech Seed / Sleep Powder: <b>'+(seedImm?'immune':'work')+'</b> · Poison Powder: <b>'+(psnImm?'immune':'works')+'</b>';
  }
  dsel.onchange = ()=>{ T.types = dsel.value.split(','); dummyInfo(); };
  dummyInfo();
  $('zoom').onchange = e=>{ S = +e.target.value; resize(); };
  $('btnHurt').onclick = ()=>{ P.hp = Math.max(1, P.hp-Math.round(20*(P.buffs.iron?0.5:1))); };
  $('btnReset').onclick = resetFight;
  $('moveList').onclick = e=>{const b=e.target.closest('.move-button'); if(!b)return; const slot=b.dataset.slot; if(slot==='click')pressBtn('click'); else if(slot==='rmb')pressBtn('rmb'); else doAction(slot);};
  window.IMMORTAL_MODE=false;
  $('btnImmortal').onclick=()=>{window.IMMORTAL_MODE=!window.IMMORTAL_MODE;$('btnImmortal').textContent='Immortality: '+(window.IMMORTAL_MODE?'ON':'off');$('btnImmortal').classList.toggle('on',window.IMMORTAL_MODE);if(window.IMMORTAL_MODE)P.hp=P.maxhp;};
  $('btnNoCd').onclick = ()=>{ NOCD = !NOCD; $('btnNoCd').textContent = 'No cooldowns: '+(NOCD?'ON':'off'); $('btnNoCd').classList.toggle('on',NOCD); if (NOCD) for (const k in cd) cd[k]=0; };
  renderPokemonUI();
})();
const dbg = $('dbg');
function resetFight(){
  const netMode = !!(window.PMD_MP && window.PMD_MP.active);
  P.hp = P.maxhp;
  if (!netMode){ T.hp = T.maxhp; T.dead = false; T.seed = T.psn = T.sleep = T.burn = T.slow = T.slide = null; T.grabbed = false; T.x = world.w*0.72; T.y = world.h*0.57; T.kx = T.ky = 0; setAnimOn(T,'Idle',false); T.once = false; }
  else if (!window.PMD_MP.peerPresent){ T.dead = true; T.deadT = 999999; }
  projs.length = effects.length = numbers.length = parts.length = orbs.length = timers.length = 0;
  P.channel = null; P.locked = false; P.dash = null; P.pending = null; P.noCancel = false; P.buffs = {}; P.speedMul = 1; P.trail.length = 0; motes.length = 0; setAnimOn(P,'Idle',false); P.once = false;
  for (const k in cd) cd[k] = 0;
  P.stages = {def:0,spd:0,spa:0,spe:0}; if (!netMode){ T.stages = {def:0,spd:0}; T.root = 0; T.wind = null; } P.critStage = 0; P.laserFocus = false; P.hn = 0; P.comboT = 0; P.jump = null; P.z = 0; resetWing();
}

