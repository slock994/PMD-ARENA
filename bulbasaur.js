DEX.bulbasaur={name:'Bulbasaur',num:1,types:['grass','poison'],base:{hp:45,atk:49,def:49,spa:65,spd:65,spe:45},body:9,slots:{
click:TK,
rmb:{label:'RMB',move:'razorleaf',anim:'Charge',kind:'razor',cd:1,channel:true,hold:'Mouse2',maxHold:3,cdPerSec:0.5,desc:'Hold to fire up to 10 leaves. Stop early or use all 10; cooldown scales with leaves used (0.5s per leaf, max 5s).',p:{mobile:true,moveMul:0.7,limitedShots:10}},
Q:{label:'Q',move:'leechseed',anim:'Shoot',kind:'seed',cd:4,fireFrame:2,desc:'Seed projectile. Drains the target and heals you. Grass types are immune.'},
E:{label:'E',move:'vinewhip',anim:'Attack',kind:'vines',cd:1,noLunge:true,moveCast:true,desc:'Two vines slam the ground ahead. You can move while casting.'},

Space:DODGE,Shift:DASH}};
