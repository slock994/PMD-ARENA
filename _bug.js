Object.assign(MOVES,{
 stringshot:{name:'String Shot',type:'bug',cat:'status',power:null,acc:'95',learn:''},
 bugbite:{name:'Bug Bite',type:'bug',cat:'physical',power:60,acc:'100',learn:''},
 bugbuzz:{name:'Bug Buzz',type:'bug',cat:'special',power:90,acc:'100',learn:''},
 poisonsting:{name:'Poison Sting',type:'poison',cat:'physical',power:15,acc:'100',learn:''},
 harden:{name:'Harden',type:'normal',cat:'status',power:null,acc:'—',learn:''},
 quiverdance:{name:'Quiver Dance',type:'bug',cat:'status',power:null,acc:'—',learn:''},
 tailwind:{name:'Tailwind',type:'flying',cat:'status',power:null,acc:'—',learn:''},
 xscissor:{name:'X-Scissor',type:'bug',cat:'physical',power:80,acc:'100',learn:''},
 drillrun:{name:'Drill Run',type:'ground',cat:'physical',power:80,acc:'95',learn:''},
 focusenergy:{name:'Focus Energy',type:'normal',cat:'status',power:null,acc:'—',learn:''},
 poisonjab:{name:'Poison Jab',type:'poison',cat:'physical',power:80,acc:'100',learn:''}});
const STRING={label:'E',move:'stringshot',anim:'Shoot',kind:'proj',cd:5,fireFrame:1,desc:'A larger web shot that roots the target for 2 seconds. 5 second cooldown.',p:{n:1,style:'web',speed:230,r:6,life:5,mult:0,root:2}};
const BUGBITE={label:'RMB',move:'bugbite',anim:'Attack',kind:'dashhit',cd:5,noLunge:true,fireFrame:1,desc:'Short dash that bites what it touches.',p:{speed:250,dur:0.28,mult:1.4,fx:'bite',stop:true,reach:22,knock:{v:90,dur:0.15,wall:0}}};
const HARDEN=(evo)=>({label:'LMB',move:'harden',anim:'Charge',kind:'stage',cd:1,fireFrame:0,desc:'Raises Defense one stage. Use it 5 times to evolve into '+evo+'. You cannot move.',p:{stages:{def:1},quest:true,questMax:5}});
