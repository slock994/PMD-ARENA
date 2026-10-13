Object.assign(MOVES,{
 suckerpunch:{name:'Sucker Punch',type:'dark',cat:'physical',power:70,acc:'100',learn:''},
 superfang:{name:'Super Fang',type:'normal',cat:'physical',power:null,acc:'90',learn:''},
 laserfocus:{name:'Laser Focus',type:'normal',cat:'status',power:null,acc:'—',learn:''}
});
DEX.raticate={name:'Raticate',num:20,remote:true,types:['normal'],base:{hp:55,atk:81,def:60,spa:50,spd:70,spe:97},body:10,sh:9,slots:{
click:{label:'LMB',move:'suckerpunch',anim:'Charge',kind:'sucker',cd:1,channel:true,hold:'Mouse0',maxHold:10,p:{mobile:true,moveMul:0.85},desc:'Hold while moving to wind up for up to 10 seconds; release to dash a short distance and punch.'},
rmb:{label:'RMB',move:'quickattack',anim:'Attack',kind:'dashhit',cd:0.5,noLunge:true,fireFrame:1,desc:'A very fast, short dash that hits what it touches.',p:{speed:500,dur:0.13,mult:1.1,fx:'tackle',stop:true,trail:true,tint:'rgba(255,255,255,0.5)',reach:20,knock:{v:150,dur:0.2,wall:0}}},
Q:{label:'Q',move:'laserfocus',anim:'Charge',kind:'laserfocus',cd:10,fireFrame:2,desc:'Your next damaging hit is guaranteed to critically hit; focus lasts 5 minutes.',p:{crit:2,dur:300}},
E:{label:'E',move:'superfang',anim:'Attack',kind:'superfang',cd:8,noLunge:true,fireFrame:1,desc:'A vicious bite that halves the target’s current HP.'},
Space:DODGE,Shift:DASH}};
