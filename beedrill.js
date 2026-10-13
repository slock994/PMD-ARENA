DEX.beedrill={name:'Beedrill',num:15,remote:true,types:['bug','poison'],base:{hp:65,atk:90,def:40,spa:45,spd:80,spe:75},body:12,sh:8,slots:{
click:{label:'LMB',move:'xscissor',anim:'Attack',kind:'xs',cd:0.5,noLunge:true,fireFrame:2,desc:'3-hit combo. Click again within a moment; the 3rd hit knocks the enemy back.'},
rmb:{label:'RMB',move:'poisonjab',anim:'Attack',kind:'jab',cd:1,noLunge:true,fireFrame:2,desc:'Two quick jabs. The second may poison.'},
Q:{label:'Q',move:'focusenergy',anim:'Charge',kind:'stage',cd:15,fireFrame:3,desc:'Raises critical-hit ratio for 10 seconds.',p:{crit:2,dur:10}},
E:{label:'E',move:'drillrun',anim:'Attack',kind:'drillrun2',cd:5,noLunge:true,fireFrame:1,desc:'Charge for 0.5 seconds with a steel sparkle aura, then steer Drill Run toward the cursor. On contact, hold the target for five stabs and throw them in your facing direction.',p:{speed:430,dur:1.5,mult:0.25,fx:'drill',reach:24,multi:true,trail:true,tint:'rgba(200,200,220,0.5)'}},
Space:DODGE,Shift:DASH}};
