DEX.squirtle={name:'Squirtle',num:7,types:['water'],base:{hp:44,atk:48,def:65,spa:50,spd:64,spe:43},body:8,sh:8,slots:{
click:TK,
rmb:{label:'RMB',move:'bubblebeam',anim:'Shoot',kind:'stream',cd:1,channel:true,hold:'Mouse2',maxHold:5,cdPerSec:0,desc:'Hold RMB to fire up to 10 slower bubbles. Cooldown scales with use; full stream is 5 seconds.',p:{el:'bubble',rate:0.28,speed:105,spread:0.07,r:4,life:1.35,mult:0.08,slow:0.1,mobile:true,limitedShots:10,moveMul:0.6}},
Q:{label:'Q',move:'bite',anim:'Attack',kind:'dashhit',cd:5,noLunge:true,fireFrame:1,desc:'Short dash. On impact it catches the enemy and throws it away; hitting the arena wall adds impact damage.',p:{speed:260,dur:0.3,mult:0.9,fx:'bite',grab:true,reach:22,throwSpec:{v:300,dur:0.35,wall:0.12,land:0.03,away:true}}},
E:{label:'E',move:'watergun',anim:'Shoot',kind:'laser',cd:3,channel:true,noCancel:true,cdPerSec:0,desc:'0.5s charge, then a thin water laser across the map. You cannot move while using it.',p:{mult:1.4}},
Space:DODGE,Shift:DASH}};
