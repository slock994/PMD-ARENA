Object.assign(MOVES,{gunkshot:{name:'Gunk Shot',type:'poison',cat:'physical',power:120,acc:'80',learn:''},glare:{name:'Glare',type:'normal',cat:'status',power:null,acc:'100',learn:''}});
DEX.arbok={name:'Arbok',num:24,remote:true,types:['poison'],base:{hp:60,atk:95,def:69,spa:65,spd:79,spe:80},body:11,sh:10,slots:{
click:{label:'LMB',move:'brutalswing',anim:'Attack',kind:'arbokswing',cd:0.5,noLunge:true,fireFrame:1,desc:'Three successful tail swings grab the target for 2 seconds while Arbok turns to face the cursor.'},
rmb:{label:'RMB',move:'poisonjab',anim:'Attack',kind:'poisonbite',cd:1,noLunge:true,fireFrame:1,desc:'A short poisonous bite, ideal while the target is held.'},
Q:{label:'Q',move:'glare',anim:'Shake',kind:'glare',cd:10,fireFrame:2,desc:'A short glare wave stuns the target for 2 seconds.'},
E:{label:'E',move:'gunkshot',anim:'Shoot',kind:'proj',cd:7,noLunge:true,fireFrame:1,desc:'Three slow purple poison globs that can poison.',p:{n:3,spread:0.16,style:'poisonball',speed:170,r:8,life:1.4,mult:0.42,psn:0.35}},
Space:DODGE,Shift:DASH}};
