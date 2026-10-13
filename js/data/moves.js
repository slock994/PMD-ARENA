// ---------------- Pokémon data (Pokémon Database, Gen 9) ----------------
const LEVEL = 50;
function calcStats(b){
  const f = v => Math.floor((2*v+31)*LEVEL/100)+5;
  return {hp:Math.floor((2*b.hp+31)*LEVEL/100)+LEVEL+10, atk:f(b.atk), def:f(b.def), spa:f(b.spa), spd:f(b.spd), spe:f(b.spe)};
}
const DUMMY = {name:'Training dummy', base:{hp:100,atk:50,def:70,spa:50,spd:70,spe:50}};
const MOVES = {
  vinewhip:    {name:'Vine Whip',     type:'grass',  cat:'physical', power:45,   acc:'100', learn:'Lv. 3'},
  leechseed:   {name:'Leech Seed',    type:'grass',  cat:'status',   power:null, acc:'90',  learn:'Lv. 9'},
  razorleaf:   {name:'Razor Leaf',    type:'grass',  cat:'physical', power:55,   acc:'95',  learn:'Lv. 12'},
  poisonpowder:{name:'Poison Powder', type:'poison', cat:'status',   power:null, acc:'75',  learn:'Lv. 15'},
  sleeppowder: {name:'Sleep Powder',  type:'grass',  cat:'status',   power:null, acc:'75',  learn:'Lv. 15'},
  magicalleaf: {name:'Magical Leaf',  type:'grass',  cat:'special',  power:60,   acc:'never misses', learn:'TM33 (Lv. 30 in Legends: Z-A)'},
  synthesis:   {name:'Synthesis',     type:'grass',  cat:'status',   power:null, acc:'—',   learn:'Lv. 37'},
  sludgewave:  {name:'Sludge Wave',   type:'poison', cat:'special',  power:95,   acc:'100', learn:'Legends: Z-A (Bulbasaur Lv. 42)'},
  solarbeam:   {name:'Solar Beam',    type:'grass',  cat:'special',  power:120,  acc:'100', learn:'Lv. 58 / TM168'},
  ember:       {name:'Ember',         type:'fire',     cat:'special',  power:40,  acc:'100', learn:''},
  tackle:      {name:'Tackle',        type:'normal',   cat:'physical', power:40,  acc:'100', learn:''},
  smokescreen: {name:'Smokescreen',   type:'normal',   cat:'status',   power:null,acc:'100', learn:''},
  dragonbreath:{name:'Dragon Breath', type:'dragon',   cat:'special',  power:60,  acc:'100', learn:''},
  firefang:    {name:'Fire Fang',     type:'fire',     cat:'physical', power:65,  acc:'95',  learn:''},
  firespin:    {name:'Fire Spin',     type:'fire',     cat:'special',  power:35,  acc:'85',  learn:''},
  flamethrower:{name:'Flamethrower',  type:'fire',     cat:'special',  power:90,  acc:'100', learn:''},
  airslash:    {name:'Air Slash',     type:'flying',   cat:'special',  power:75,  acc:'95',  learn:''},
  flareblitz:  {name:'Flare Blitz',   type:'fire',     cat:'physical', power:120, acc:'100', learn:''},
  dragonrush:  {name:'Dragon Rush',   type:'dragon',   cat:'physical', power:100, acc:'75',  learn:''},
  bite:        {name:'Bite',          type:'dark',     cat:'physical', power:60,  acc:'100', learn:''},
  watergun:    {name:'Water Gun',     type:'water',    cat:'special',  power:40,  acc:'100', learn:''},
  bubblebeam:  {name:'Bubble Beam',   type:'water',    cat:'special',  power:65,  acc:'100', learn:''},
  aquaring:    {name:'Aqua Ring',     type:'water',    cat:'status',   power:null,acc:'—',   learn:''},
  icywind:     {name:'Icy Wind',      type:'ice',      cat:'special',  power:55,  acc:'95',  learn:''},
  aquajet:     {name:'Aqua Jet',      type:'water',    cat:'physical', power:40,  acc:'100', learn:''},
  hydropump:   {name:'Hydro Pump',    type:'water',    cat:'special',  power:110, acc:'80',  learn:''},
  irondefense: {name:'Iron Defense',  type:'steel',    cat:'status',   power:null,acc:'—',   learn:''},
  liquidation: {name:'Liquidation',   type:'water',    cat:'physical', power:85,  acc:'100', learn:''}
};
const DODGE = {label:'Space', move:null, anim:'Hop', kind:null, cd:0.9, dodge:true, dashSpeed:130};
const DASH  = {label:'Shift', move:null, anim:'Rotate', kind:null, cd:3, dodge:true, dashSpeed:250, trail:true};
