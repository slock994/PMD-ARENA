Object.assign(MOVES,{
 airslash:{name:'Air Slash',type:'flying',cat:'special',power:75,acc:'95',learn:''},
 hurricane:{name:'Hurricane',type:'flying',cat:'special',power:95,acc:'70',learn:''},
 bravebird:{name:'Brave Bird',type:'flying',cat:'physical',power:90,acc:'100',learn:''}
});
DEX.pidgeot={name:'Pidgeot',num:18,remote:true,types:['normal','flying'],base:{hp:83,atk:80,def:75,spa:70,spd:70,spe:101},body:12,sh:11,slots:{
click:{label:'LMB',move:'airslash',anim:'Attack',kind:'aircombo',cd:0.5,noLunge:true,fireFrame:2,desc:'Basic combo: 1 air slash, then 2, then 3, repeating if you click again within 1.3 seconds. Hits are not required to advance the sequence.'},
rmb:{label:'RMB',move:'hurricane',anim:'Charge',kind:'hurricane',cd:12,channel:true,hold:'Mouse2',maxHold:5,cdPerSec:0,desc:'Hold still to sustain a tornado that pulls the whole arena inward, spins the target clockwise, and throws it when released.'},
Q:{label:'Q',move:'agility',anim:'Charge',kind:'agility',cd:14,fireFrame:2,desc:'Raises Speed by two stages for 8 seconds. You also attack faster.'},
E:{label:'E',move:'bravebird',anim:'Charge',kind:'brave',cd:10,noLunge:true,fireFrame:3,desc:'Wind up, then fly straight toward the cursor. Catch the target and carry it to a wall before a huge recoil shockwave.'},
Space:DODGE,Shift:DASH}};
