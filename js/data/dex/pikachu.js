// Pikachu: custom move kit. Mechanics are implemented in js/engine/pikachu.js.
Object.assign(MOVES, {
  quickattack:{name:'Quick Attack',type:'normal',cat:'physical',power:40,acc:'100',learn:''},
  thunderbolt:{name:'Thunderbolt',type:'electric',cat:'special',power:90,acc:'100',learn:''},
  electroball:{name:'Electro Ball',type:'electric',cat:'special',power:80,acc:'100',learn:''},
  volttackle:{name:'Volt Tackle',type:'electric',cat:'physical',power:120,acc:'100',learn:''},
  irontail:{name:'Iron Tail',type:'steel',cat:'physical',power:100,acc:'75',learn:''}
});
DEX.pikachu={name:'Pikachu',num:25,remote:true,types:['electric'],base:{hp:35,atk:55,def:40,spa:50,spd:50,spe:90},body:10,sh:9,slots:{
  click:{label:'LMB',move:'quickattack',anim:'Attack',kind:'pikachuCombo',cd:1,noLunge:true,fireFrame:1,desc:'Quick Attack dash, teleport behind, Quick Attack, teleport behind, then a wall-bouncing Iron Tail.'},
  rmb:{label:'RMB',move:'thunderbolt',anim:'Shoot',kind:'pikachuThunder',cd:10,noLunge:true,fireFrame:1,desc:'Hold to steer a yellow electric laser for up to 2 seconds. Cooldown begins when released; LMB detonates an electrified target once every 4 seconds.'},
  Q:{label:'Q',move:'volttackle',anim:'Attack',kind:'pikachuVolt',cd:10,noLunge:true,fireFrame:1,desc:'Hold Q to charge; release to launch a stronger, faster Volt Tackle. Hits launch the target into repeated wall bounces.'},
  E:{label:'E',move:'electroball',anim:'Shoot',kind:'pikachuElectroBall',cd:5,noLunge:true,fireFrame:1,desc:'Throw Electro Ball; recast within 1.3 seconds for two more throws with longer sideways dashes.'},
  Space:DODGE,Shift:DASH
}};
