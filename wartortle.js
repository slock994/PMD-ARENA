DEX.wartortle={name:'Wartortle',num:8,types:['water'],base:{hp:59,atk:63,def:80,spa:65,spd:80,spe:58},body:10,sh:9,slots:{
click:BUBBLE_CLICK,
rmb:Object.assign({},AQUAJET,{kind:'aquaJetHold',channel:true,hold:'Mouse2',maxHold:5,cdPerSec:0}),
Q:{label:'Q',move:'aquaring',anim:'Charge',kind:'buff',cd:15,fireFrame:3,desc:'A veil of water that heals you over 6 seconds.',p:{type:'aqua',dur:6}},
E:{label:'E',move:'icywind',anim:'Shoot',kind:'icecone',cd:5,desc:'Longer cone of icy wind. Slows the target.',p:{range:130,half:30,mult:1.2}},
Space:DODGE,Shift:DASH}};
