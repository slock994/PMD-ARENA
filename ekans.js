Object.assign(MOVES,{brutalswing:{name:'Brutal Swing',type:'dark',cat:'physical',power:60,acc:'100',learn:''}});
DEX.ekans={name:'Ekans',num:23,remote:true,types:['poison'],base:{hp:35,atk:60,def:44,spa:40,spd:54,spe:55},body:7,sh:8,slots:{
click:Object.assign({},TK,{cd:0.5}),
rmb:{label:'RMB',move:'brutalswing',anim:'Attack',kind:'brutal',cd:1,noLunge:true,fireFrame:1,desc:'A wide tail swing that knocks the target away.'},
E:{label:'E',move:'poisonsting',anim:'Shoot',kind:'proj',cd:2,noLunge:true,fireFrame:1,desc:'Poison stinger. 30% chance to poison.',p:{n:1,style:'sting',speed:260,r:3,life:0.8,mult:1.2,psn:0.3}},
Space:DODGE,Shift:DASH}};
