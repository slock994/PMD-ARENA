Object.assign(MOVES,{drillpeck:{name:'Drill Peck',type:'flying',cat:'physical',power:80,acc:'100',learn:''}});
DEX.fearow={name:'Fearow',num:22,remote:true,types:['normal','flying'],base:{hp:65,atk:90,def:65,spa:61,spd:61,spe:100},body:12,sh:10,slots:{
click:{label:'LMB',move:'drillpeck',anim:'Attack',kind:'drillpeck',cd:1,channel:true,hold:'Mouse0',maxHold:2.5,desc:'Hold to spin your beak in melee range while moving. Ten successful hits launch the target away.',p:{mobile:true,moveMul:0.72}},
rmb:{label:'RMB',move:'aerialace',anim:'Attack',kind:'aerial',cd:5,noLunge:true,fireFrame:1,desc:'Steer Aerial Ace with the cursor for up to 5 seconds; catch and launch a target to end early.'},
Q:{label:'Q',move:'agility',anim:'Charge',kind:'agility',cd:15,fireFrame:2,desc:'Raises Speed by two stages for 7 seconds. You also attack faster.'},
E:{label:'E',move:'drillrun',anim:'Attack',kind:'drillrun2',cd:5,noLunge:true,fireFrame:1,desc:'Charge in a straight line. On contact, drill through the target and throw it sideways into the arena wall.'},
Space:DODGE,Shift:DASH}};
