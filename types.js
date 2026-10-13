// ---------------- type chart ----------------
const TYPES = ['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const TCOL = {normal:'#a8a77a',fire:'#ee8130',water:'#6390f0',electric:'#e0b800',grass:'#5fae38',ice:'#6cbfbb',fighting:'#c22e28',poison:'#a33ea1',ground:'#c9a43f',flying:'#8d74e0',psychic:'#f95587',bug:'#8f9f10',rock:'#a08d2c',ghost:'#735797',dragon:'#6f35fc',dark:'#705746',steel:'#8e8ea8',fairy:'#d685ad'};
const CHART = {
  normal:{rock:.5,steel:.5,ghost:0},
  fire:{fire:.5,water:.5,grass:2,ice:2,bug:2,rock:.5,dragon:.5,steel:2},
  water:{fire:2,water:.5,grass:.5,ground:2,rock:2,dragon:.5},
  electric:{water:2,electric:.5,grass:.5,ground:0,flying:2,dragon:.5},
  grass:{fire:.5,water:2,grass:.5,poison:.5,ground:2,flying:.5,bug:.5,rock:2,dragon:.5,steel:.5},
  ice:{fire:.5,water:.5,grass:2,ice:.5,ground:2,flying:2,dragon:2,steel:.5},
  fighting:{normal:2,ice:2,poison:.5,flying:.5,psychic:.5,bug:.5,rock:2,ghost:0,dark:2,steel:2,fairy:.5},
  poison:{grass:2,poison:.5,ground:.5,rock:.5,ghost:.5,steel:0,fairy:2},
  ground:{fire:2,electric:2,grass:.5,poison:2,flying:0,bug:.5,rock:2,steel:2},
  flying:{electric:.5,grass:2,fighting:2,bug:2,rock:.5,steel:.5},
  psychic:{fighting:2,poison:2,psychic:.5,dark:0,steel:.5},
  bug:{fire:.5,grass:2,fighting:.5,poison:.5,flying:.5,psychic:2,ghost:.5,dark:2,steel:.5,fairy:.5},
  rock:{fire:2,ice:2,fighting:.5,ground:.5,flying:2,bug:2,steel:.5},
  ghost:{normal:0,psychic:2,ghost:2,dark:.5},
  dragon:{dragon:2,steel:.5,fairy:0},
  dark:{fighting:.5,psychic:2,ghost:2,dark:.5,fairy:.5},
  steel:{fire:.5,water:.5,electric:.5,ice:2,rock:2,steel:.5,fairy:2},
  fairy:{fire:.5,fighting:2,poison:.5,dragon:2,dark:2,steel:.5}
};
function typeMult(atk, defTypes){ let m = 1; for (const d of defTypes) m *= (CHART[atk][d] ?? 1); return m; }
const cap = s => s[0].toUpperCase()+s.slice(1);
const chip = t => `<span class="chip" style="background:${TCOL[t]}">${cap(t)}</span>`;
const fmtMult = m => m===0 ? 'immune' : m===.25 ? '¼×' : m===.5 ? '½×' : m+'×';

