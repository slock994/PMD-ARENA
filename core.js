const TICK = 1/60;
const world = {w:480, h:300};
let S = 2; const DATA = SPRITES; let NOCD = false; const PORTRAIT = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/portrait/";
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
function resize(){ cv.width = world.w*S; cv.height = world.h*S; ctx.imageSmoothingEnabled = false; }
resize();
const tmp = document.createElement('canvas'); tmp.width = 130; tmp.height = 140;
const tctx = tmp.getContext('2d'); tctx.imageSmoothingEnabled = false;
for (const set of Object.values(DATA)) for (const a of Object.values(set)){ const im = new Image(); im.src = a.img; a.image = im; }
const $ = id => document.getElementById(id);

let CUR = DEX.bulbasaur, SLOTS = CUR.slots;
const PAL = {
  grass:{dark:'#1f4a1c', main:'#58c24a', pale:'#d2ffb0', white:'#ffffff'},
  poison:{dark:'#3b1456', main:'#9b4ad6', mid:'#b873ea', pale:'#e7c4ff', white:'#ffffff'},
  sleep:{dark:'#4d4a12', main:'#d8d84a', mid:'#ecec86', pale:'#fbfbc8', white:'#ffffff'},
  fire:{dark:'#7a1c05', main:'#ff8a2a', pale:'#fff0a0', white:'#ffffff'},
  water:{dark:'#16407a', main:'#3f8bff', pale:'#cfeaff', white:'#ffffff'},
  ice:{dark:'#2f5f80', main:'#8fdcff', pale:'#f0fcff', white:'#ffffff'},
  flying:{dark:'#4a5f78', main:'#cfe0f0', pale:'#ffffff', white:'#ffffff'},
  dragon:{dark:'#2a1c6b', main:'#7a56e8', pale:'#e6dcff', white:'#ffffff'},
  normal:{dark:'#4d5260', main:'#ffffff', pale:'#ffffff', white:'#ffffff'},
  dark:{dark:'#1a100c', main:'#7a5a48', pale:'#e8d8c8', white:'#ffffff'},
  steel:{dark:'#3a4452', main:'#b8c4d4', pale:'#ffffff', white:'#ffffff'}
};
const RAMPS = {
  flame:['#fff3a0','#ffd23a','#ff9a2a','#e0451a','#5a2a1a'],
  dragon:['#f0e6ff','#b995ff','#7a56e8','#4630a8','#241a5a'],
  ice:['#ffffff','#d8f6ff','#9fe2ff','#5cc0f0','#3a8ac0']
};
const RAINBOW = ['#ff7aa8','#ffd23a','#6ee0ff','#b58cff','#7dff8a'];
let flashA = 0;
const motes = [];

// ---------------- entities ----------------
function mkEnt(set,x,y,body){ return {A:set,x,y,body,row:0,anim:'Idle',frame:0,t:0,once:false}; }
const P = Object.assign(mkEnt(DATA.bulbasaur,140,175,CUR.body), {types:CUR.types, stats:calcStats(CUR.base), locked:false, dash:null, pending:null, channel:null, curSlot:null, noCancel:false, trail:[], trailT:0, buffs:{}, speedMul:1, sh:9});
P.maxhp = P.hp = P.stats.hp; P.speed = 38+CUR.base.spe*0.55;
const T = Object.assign(mkEnt(DATA.pikachu,350,170,10), {types:['water'], stats:calcStats(DUMMY.base), dead:false, deadT:0, hurtT:0, flashT:0, kx:0, ky:0, seed:null, psn:null, sleep:null, burn:null, slow:null, slide:null, grabbed:false, zT:0, bubbleT:0, burnFx:0});
T.maxhp = T.hp = T.stats.hp;
const bodyY = e => e.y - e.body;
const keys = {};
const mouse = {x:world.w/2, y:world.h/2+40};
let hitstop = 0, shakeT = 0, shakeMag = 0;
const projs = [], effects = [], numbers = [], parts = [], orbs = [], timers = [];
const cd = {click:0,Q:0,E:0,R:0,Space:0,Shift:0};

function setAnimOn(e, name, once){
  if (!e.A[name]) name = 'Idle';
  if (e.anim === name && !once) return;
  e.anim = name; e.frame = 0; e.t = 0; e.once = !!once;
}
function stepAnim(e, dt){
  const a = e.A[e.anim]; let finished = false;
  e.t += dt/TICK;
  while (e.t >= a.dur[e.frame]){
    e.t -= a.dur[e.frame]; e.frame++;
    if (e.frame >= a.dur.length){
      if (e.once){ finished = true; e.frame = a.dur.length-1; e.t = 0; break; }
      e.frame = 0;
    }
  }
  return finished;
}
function rowFromAngle(dx, dy){
  const deg = Math.atan2(dy, dx) * 180/Math.PI;
  return (((Math.round((90 - deg)/45)) % 8) + 8) % 8;
}
const rnd = (a,b) => a + Math.random()*(b-a);

