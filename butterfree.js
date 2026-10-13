DEX.butterfree={name:'Butterfree',num:12,remote:true,types:['bug','flying'],base:{hp:60,atk:45,def:50,spa:90,spd:80,spe:70},body:12,sh:8,slots:{
click:{label:'LMB',move:'bugbuzz',anim:'Shoot',kind:'proj',cd:1,noLunge:true,fireFrame:2,desc:'Two sound waves that lower the target Sp. Def.',p:{n:2,spread:0.1,style:'sound',speed:210,r:6,life:0.8,mult:0.35,stg:{spd:-1}}},
rmb:{label:'RMB',move:'airslash',anim:'Attack',kind:'proj',cd:1,noLunge:true,fireFrame:5,desc:'Two wide air blades in a small fan.',p:{n:2,spread:0.12,style:'airslash',speed:250,r:7,life:0.75,mult:0.45}},
Q:{label:'Q',move:'quiverdance',anim:'Charge',kind:'quiver',cd:20,channel:true,noCancel:true,maxHold:0.25,cdPerSec:0,desc:'Raises Sp. Atk, Sp. Def and Speed by one stage for 5 seconds (half the earlier boost).'},
E:{label:'E',move:'tailwind',anim:'Shoot',kind:'wind',cd:14,fireFrame:2,desc:'A wind covers the whole arena and pushes everyone except you toward the cursor.'},
Space:DODGE,Shift:DASH}};
