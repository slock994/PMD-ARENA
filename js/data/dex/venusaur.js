DEX.venusaur={name:'Venusaur',num:3,types:['grass','poison'],base:{hp:80,atk:82,def:83,spa:100,spd:100,spe:80},body:14,slots:{
click:{label:'LMB',move:'magicalleaf',anim:'Shoot',kind:'mbasic',cd:2,noLunge:true,fireFrame:2,desc:'Three small leaves that curve toward a target near your aim.'},
rmb:{label:'RMB',move:'solarbeam',anim:'Charge',kind:'solar',cd:12,channel:true,noCancel:true,hold:'Mouse2',cdPerSec:2,desc:'Charge 0.8s, then hold RMB to keep the beam up for up to 4s. It follows the cursor slowly. You cannot move.',p:{turn:0.55,maxBeam:4}},
Q:{label:'Q',move:'synthesis',anim:'Shake',kind:'synth',cd:7,channel:true,hold:'KeyQ',maxHold:3,cdPerSec:0,freeT:0.35,desc:'Tap for a quick heal, or hold to keep healing for up to 3 seconds.'},
E:{label:'E',move:'sludgewave',anim:'Attack',kind:'sludge',cd:5,noLunge:true,desc:'A slow, wide wave of sludge. 30% chance to poison. Steel types take no damage.'},
Space:DODGE,Shift:DASH}};
