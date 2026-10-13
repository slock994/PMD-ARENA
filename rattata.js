DEX.rattata={name:'Rattata',num:19,remote:true,types:['normal'],base:{hp:30,atk:56,def:35,spa:25,spd:35,spe:72},body:7,sh:7,slots:{
click:Object.assign({},TK,{cd:0.5}),
rmb:{label:'RMB',move:'bite',anim:'Attack',kind:'dashhit',cd:0.5,noLunge:true,fireFrame:1,desc:'Short biting dash that grabs the target and throws them in the direction of the cursor.',p:{speed:270,dur:0.28,mult:1.0,fx:'bite',grab:true,reach:22,throwSpec:{v:300,dur:0.35,wall:0.12,land:0.03}}},
E:{label:'E',move:'focusenergy',anim:'Charge',kind:'stage',cd:10,fireFrame:2,desc:'Raises critical-hit ratio for 10 seconds.',p:{crit:2,dur:10}},
Space:DODGE,Shift:DASH}};
