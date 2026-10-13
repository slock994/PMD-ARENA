Object.assign(MOVES,{furyattack:{name:'Fury Attack',type:'normal',cat:'physical',power:15,acc:'85',learn:''},aerialace:{name:'Aerial Ace',type:'flying',cat:'physical',power:60,acc:'never misses',learn:''}});
DEX.spearow={name:'Spearow',num:21,remote:true,types:['normal','flying'],base:{hp:40,atk:60,def:30,spa:31,spd:31,spe:70},body:8,sh:7,slots:{
click:{label:'LMB',move:'furyattack',anim:'Attack',kind:'fury',cd:0.3,noLunge:true,fireFrame:1,desc:'Six-click cursor-aimed spear combo: strike, strike, blink behind, strike, blink behind, then a wall-smashing final strike.'},
rmb:{label:'RMB',move:'aerialace',anim:'Attack',kind:'aerial',cd:5,noLunge:true,fireFrame:1,desc:'A long homing dash to the nearest enemy, ending in a powerful wall-bouncing launch.'},
Space:DODGE,Shift:DASH}};
