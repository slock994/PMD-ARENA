// Writes the script tags for sprites, shared files and every Pokémon in ROSTER, in order.
(function(){
  const t = [];
  for (const n of EMBEDDED.concat(['pikachu'])) t.push('js/data/sprites/'+n+'.js');
  for (const n of SHARED) t.push('js/data/dex/'+n+'.js');
  for (const n of ROSTER) t.push('js/data/dex/'+n+'.js');
  for (const s of t) document.write('<script src="'+s+'"><\/script>');
})();
