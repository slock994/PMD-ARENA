Object.assign(MOVES,{
 wingattack:{name:'Wing Attack',type:'flying',cat:'physical',power:60,acc:'100',learn:''},
 agility:{name:'Agility',type:'psychic',cat:'status',power:null,acc:'—',learn:''},
 whirlwind:{name:'Whirlwind',type:'normal',cat:'status',power:null,acc:'—',learn:''}});
DEX.pidgeotto={name:'Pidgeotto',num:17,remote:true,types:['normal','flying'],base:{hp:63,atk:60,def:55,spa:50,spd:50,spe:71},body:9,sh:9,slots:{
click:{label:'LMB',move:'wingattack',anim:'Attack',kind:'wing',cd:0.3,noLunge:true,fireFrame:1,desc:'5-hit combo, keep clicking: slash, slash, teleport behind the target, push away, then a Vergil-style flurry of slashes while you are hidden and the enemy is staggered. The last hit knocks both of you back.'},
rmb:{label:'RMB',move:'airslash',anim:'Attack',kind:'proj',cd:3.5,noLunge:true,fireFrame:5,desc:'Two wide air blades in a small fan.',p:{n:2,spread:0.12,style:'airslash',speed:250,r:7,life:0.75,mult:0.45}},
Q:{label:'Q',move:'agility',anim:'Charge',kind:'agility',cd:14,fireFrame:2,desc:'Raises Speed by two stages for 8 seconds. You also attack faster.'},
E:{label:'E',move:'whirlwind',anim:'Shoot',kind:'whirl',cd:10,fireFrame:2,desc:'A powerful wind blast pushes enemies toward the wall, causing wall-impact damage.'},
Space:DODGE,Shift:DASH}};
