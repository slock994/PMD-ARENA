Object.assign(MOVES,{
 quickattack:{name:'Quick Attack',type:'normal',cat:'physical',power:40,acc:'100',learn:''},
 gust:{name:'Gust',type:'flying',cat:'special',power:40,acc:'100',learn:''},
 twister:{name:'Twister',type:'dragon',cat:'special',power:40,acc:'100',learn:''}});
DEX.pidgey={name:'Pidgey',num:16,remote:true,types:['normal','flying'],base:{hp:40,atk:45,def:40,spa:35,spd:35,spe:56},body:7,sh:7,slots:{
click:{label:'LMB',move:'quickattack',anim:'Attack',kind:'dashhit',cd:1,noLunge:true,fireFrame:1,desc:'Basic attack. A very fast, short dash that hits what it touches, every 1 second.',p:{speed:480,dur:0.125,mult:1.1,fx:'tackle',stop:true,trail:true,tint:'rgba(255,255,255,0.5)',reach:20,knock:{v:150,dur:0.2,wall:0}}},
rmb:{label:'RMB',move:'gust',anim:'Shoot',kind:'gust',cd:8,fireFrame:2,desc:'Creates a broad cone-shaped gust toward the cursor for 4.5 seconds. Enemies are pushed hard toward the wall and take impact damage.'},
E:{label:'E',move:'twister',anim:'Shoot',kind:'twister',cd:9,fireFrame:2,desc:'Spawns 2 tornadoes above and below you and fires them at the cursor, one second apart.'},
Space:DODGE,Shift:DASH}};
