// Runtime sprite loader for Pokémon without embedded sprites (fetches from PMDCollab on first use; needs internet).
const REMOTE = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/';
const loadImg = u => new Promise((ok,no)=>{ const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = ()=>ok(i); i.onerror = no; i.src = u; });
function mkAnim(img, fw, fh, dur, hit, rush){
  const cols = Math.floor(img.width/fw), rows = Math.floor(img.height/fh), c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img,0,0); const bots = [];
  try {
    const D = x.getImageData(0,0,c.width,c.height).data;
    for (let r=0;r<rows;r++) for (let f=0;f<dur.length&&f<cols;f++){
      let b = -1;
      for (let yy=fh-1; yy>=0 && b<0; yy--) for (let xx=0; xx<fw; xx++) if (D[((r*fh+yy)*c.width+f*fw+xx)*4+3]>0){ b = yy; break; }
      if (b>=0) bots.push(b);
    }
  } catch(e){}
  bots.sort((a,b)=>a-b);
  const ax = [fw/2, bots.length ? bots[bots.length>>1]-1 : Math.round(fh*0.75)];
  return {fw, fh, dur, hit:hit==null?null:+hit, rush:rush==null?null:+rush, rows, anchors:Array.from({length:8},()=>dur.map(()=>ax)), image:img, img:img.src};
}
const loadingSprites = {};
function ensureSprites(id, quiet){
  if (SPRITES[id] && !(id === 'pikachu' && !SPRITES.pikachu._fullRemote)) return Promise.resolve(true);
  if (loadingSprites[id]) return loadingSprites[id];
  const d = DEX[id], base = REMOTE+String(d.num).padStart(4,'0')+'/';
  return loadingSprites[id] = (async ()=>{
    try {
      if (!quiet) logMsg('Loading '+d.name+' sprites...');
      const xml = new DOMParser().parseFromString(await (await fetch(base+'AnimData.xml')).text(), 'text/xml'), copies = [], jobs = [];
      for (const a of xml.querySelectorAll('Anim')){
        const g = t => { const e = a.querySelector(t); return e ? e.textContent.trim() : null; }, name = g('Name');
        if (g('CopyOf')){ copies.push([name, g('CopyOf')]); continue; }
        const fw = +g('FrameWidth'), fh = +g('FrameHeight'), dur = [...a.querySelectorAll('Duration')].map(e=>+e.textContent), hit = g('HitFrame'), rush = g('RushFrame');
        if (!fw || !dur.length) continue;
        jobs.push(loadImg(base+name+'-Anim.png').then(img=>({name,fw,fh,dur,hit,rush,img}), ()=>null));
      }
      const set = {};
      for (const r of await Promise.all(jobs)) if (r) set[r.name] = mkAnim(r.img, r.fw, r.fh, r.dur, r.hit, r.rush);
      for (const [n,s] of copies) if (set[s]) set[n] = set[s];
      if (!set.Idle) throw 0;
      if (id === 'pikachu') set._fullRemote = true;
      SPRITES[id] = set; if (!quiet) logMsg(d.name+' ready.'); return true;
    } catch(e){ delete loadingSprites[id]; if (!quiet) logMsg('Could not load '+d.name+' sprites (needs internet access to raw.githubusercontent.com).'); return false; }
  })();
}
// preload every downloadable Pokémon in the background so switching is instant
setTimeout(async ()=>{ for (const id of ROSTER) if (DEX[id] && DEX[id].remote && !SPRITES[id]) await ensureSprites(id, true); }, 1200);
// stat stages, evolution, bug moves
const stageMult = s => s>=0 ? (2+s)/2 : 2/(2-s);
P.stages = {def:0,spd:0,spa:0,spe:0}; T.stages = {def:0,spd:0}; P.critStage = 0; P.hn = 0;
const STG = {def:'Defense',spd:'Sp. Def',spa:'Sp. Atk',spe:'Speed'};
function addStages(e, o){
  for (const k in o){ e.stages[k] = Math.max(-6, Math.min(6, (e.stages[k]||0)+o[k])); pop(e.x, e.y-(e===P?P.body+26:34), STG[k]+(o[k]>0?' rose!':' fell!'), o[k]>0?'#ffe27a':'#a0c0ff', false); }
}
function evolve(id){ flashA = 0.9; logMsg('What? '+CUR.name+' is evolving!'); ensureSprites(id).then(ok=>{ if (ok) setPokemon(id); }); }
function drawWeb(){
  if (!T.root || T.dead) return;
  const x = Math.round(T.x), y = Math.round(bodyY(T)); ctx.fillStyle = '#f2f2f2';
  for (let k=0;k<8;k++){ const a = k*Math.PI/4; for (let r=4;r<=14;r+=2) ctx.fillRect(Math.round(x+Math.cos(a)*r), Math.round(y+Math.sin(a)*r*0.9), 1, 1); }
  for (const r of [7,13]) for (let k=0;k<16;k++){ const a = k*Math.PI/8; ctx.fillRect(Math.round(x+Math.cos(a)*r), Math.round(y+Math.sin(a)*r*0.9), 1, 1); }
}
function drawWind(e){
  const u = e.age/e.dur; ctx.fillStyle = 'rgba(230,255,240,0.8)';
  for (let i=0;i<26;i++){ const l = 14+hash(i,1)*14, sp = 260+hash(i,2)*160, o = (hash(i,3)*(world.w+60)+e.age*sp)%(world.w+60)-30, lat = hash(i,4)*(world.h+40)-20;
    const x = e.x0+e.dx*o+(-e.dy)*(lat-world.h/2), y = e.y0+e.dy*o+e.dx*(lat-world.h/2);
    pline(x, y, x+e.dx*l, y+e.dy*l, 1, u>0.8 && i%2 ? 'rgba(230,255,240,0.3)' : 'rgba(230,255,240,0.85)'); }
}
PAL.bug = {dark:'#3a4a0a', main:'#a8c82a', pale:'#eaffa0', white:'#ffffff'};
PAL.ground = {dark:'#5a4220', main:'#c9a43f', pale:'#f0e0a0', white:'#ffffff'};
