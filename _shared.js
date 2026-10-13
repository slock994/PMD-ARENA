// Shared slot templates. LMB = left mouse, RMB = right mouse.
Object.assign(MOVES,{surf:{name:'Surf',type:'water',cat:'special',power:90,acc:'100',learn:''}});
const SL=(s,label,x)=>Object.assign({},s,{label},x||{});
const TK={label:'LMB',move:'tackle',anim:'Attack',kind:'dashhit',cd:0.7,noLunge:true,fireFrame:1,desc:'Basic attack. Short dash that hits what it touches, every 0.7 seconds.',p:{speed:240,dur:0.25,mult:1.2,fx:'tackle',stop:true,knock:{v:130,dur:0.2,wall:0}}};
const POWDER={label:'Q',move:'poisonpowder',anim:'Shake',kind:'powder',cd:5,fireFrame:2,desc:'Powder cone, mid range. Poisons the target. Grass, Poison and Steel types are immune.'};
const BUBBLE_CLICK={label:'LMB',move:'bubblebeam',anim:'Shoot',kind:'stream',cd:1,channel:true,hold:'Mouse0',maxHold:5,cdPerSec:0,desc:'Hold LMB to stream up to 10 slower, readable bubbles. Cooldown scales with use; full stream is 5 seconds.',p:{el:'bubble',rate:0.28,speed:105,spread:0.06,r:4,life:1.45,mult:0.12,slow:0.1,dur:5,mobile:true,moveMul:0.75,limitedShots:10}};
const AQUAJET={label:'RMB',move:'aquajet',anim:'Attack',kind:'dashhit',cd:5,noLunge:true,steer:true,channel:true,hold:'Mouse2',maxHold:5,fireFrame:1,desc:'Big water dash. Knocks enemies back; wall impact adds damage.',p:{speed:420,dur:0.45,mult:1.5,fx:'jet',ring:'water',trail:true,tint:'rgba(120,190,255,0.55)',reach:24,knock:{v:400,dur:0.35,wall:0.12}}};
