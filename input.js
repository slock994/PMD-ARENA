// ---------------- input ----------------
function toWorld(e){
  const r = cv.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (cv.width/r.width) / S;
  mouse.y = (e.clientY - r.top) * (cv.height/r.height) / S;
}
cv.addEventListener('mousemove', toWorld);
cv.addEventListener('mousedown', e=>{ toWorld(e); cv.focus(); keys['Mouse'+e.button] = true; if (e.button===0) pressBtn('click'); if (e.button===2) pressBtn('rmb'); });
window.addEventListener('mouseup', e=>{ keys['Mouse'+e.button] = false; });
cv.addEventListener('contextmenu', e=>e.preventDefault());
window.addEventListener('keydown', e=>{
  const t = e.target && e.target.tagName;
  if (t==='SELECT' || t==='INPUT') return;
  if (['KeyW','KeyA','KeyS','KeyD','KeyQ'].includes(e.code)){ keys[e.code]=true; e.preventDefault(); }
  if (e.repeat) return;
  if (e.code==='KeyQ') doAction('Q');
  if (e.code==='KeyE') doAction('E');
  if (e.code==='Space'){ e.preventDefault(); doAction('Space'); }
  if (e.code==='ShiftLeft' || e.code==='ShiftRight') doAction('Shift');
});
window.addEventListener('keyup', e=>{ keys[e.code]=false; });
window.addEventListener('blur', ()=>{ for (const k in keys) keys[k]=false; });
