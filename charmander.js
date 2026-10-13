DEX.charmander={name:'Charmander',num:4,types:['fire'],base:{hp:39,atk:52,def:43,spa:60,spd:50,spe:65},body:8,sh:8,slots:{
click:TK,
rmb:{label:'RMB',move:'dragonbreath',anim:'Charge',kind:'stream',cd:1,channel:true,hold:'Mouse2',maxHold:5,cdPerSec:0,desc:'Breathe dragon energy in a cone for 2.4 seconds. You can keep moving, slowly.',p:{el:'dragon',range:74,half:20,tick:0.2,mult:0.3,dur:5,mobile:true,moveMul:0.7,pps:200}},
Q:{label:'Q',move:'smokescreen',anim:'Rotate',kind:'buff',cd:15,fireFrame:0,desc:'Smoke cloud. You become invisible to opponents for 5 seconds.',p:{type:'invis',dur:5}},
E:{label:'E',move:'ember',anim:'Charge',kind:'proj',cd:0.5,noLunge:true,fireFrame:3,desc:'A small fireball. 10% chance to burn.',p:{n:1,style:'ember',speed:200,r:3,life:5,mult:0.6,burn:0.1}},
Space:DODGE,Shift:DASH}};
