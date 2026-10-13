'use strict';

// Zero-dependency HTTP + WebSocket server for local/LAN/Hamachi play.
// Rooms support up to six connected players. The server maintains canonical
// shared combat state and validates player pose snapshots before relaying them.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;
const MAX_PLAYERS = 6;
const rooms = new Map();
const clients = new Set();
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_PAYLOAD = 96 * 1024;
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('PMD Arena server ready (up to 6 players per room)'); return; }
  const requested = urlPath === '/' ? '/index.html' : urlPath;
  const file = path.resolve(ROOT, '.' + requested);
  if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'index.html')) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(err.code === 'ENOENT' ? 404 : 500); res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error'); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'x-content-type-options': 'nosniff' });
    res.end(data);
  });
});

function wsFrame(payload, opcode) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload));
  const op = opcode == null ? 0x1 : opcode;
  let head;
  if (data.length < 126) head = Buffer.from([0x80 | op, data.length]);
  else if (data.length <= 0xffff) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(data.length, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(data.length), 2); }
  return Buffer.concat([head, data]);
}
function writeFrame(client, frame) {
  if (!client || client.readyState !== 1 || !client.socket || client.socket.destroyed) return;
  try { client.socket.write(frame); } catch (_) { closeClient(client); }
}
function send(client, payload) {
  if (!client || client.readyState !== 1 || !client.socket || client.socket.destroyed) return;
  try { writeFrame(client, wsFrame(JSON.stringify(payload))); } catch (_) { closeClient(client); }
}
function cleanName(name) {
  const result = String(name || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 20);
  return result || 'Trainer';
}
function newCode() {
  let code; do { code = String(Math.floor(100000 + Math.random() * 900000)); } while (rooms.has(code)); return code;
}
function newPlayerId() { return crypto.randomBytes(6).toString('hex'); }
function playerInfo(c) { return { id: c.meta.id, name: c.meta.name, role: c.meta.role }; }
function roomRoster(room) { return Array.from(room.players.values()).filter(c => c.readyState === 1 && c.meta).map(playerInfo); }
function broadcast(room, packet, exceptId) {
  // Serialize a broadcast once, not once per recipient. When a client is behind,
  // discard stale state/visual snapshots instead of queueing seconds of old data.
  let frame;
  try { frame = wsFrame(JSON.stringify(packet)); } catch (_) { return; }
  const isSnapshot = packet && (packet.type === 'peerState' || packet.type === 'peerVisuals');
  for (const c of room.players.values()) {
    if (!c.meta || c.meta.id === exceptId) continue;
    if (isSnapshot && c.socket && c.socket.writableLength > 96 * 1024) continue;
    writeFrame(c, frame);
  }
}
function removeClient(client) {
  if (!client || !client.meta) return;
  const meta = client.meta; client.meta = null;
  const room = rooms.get(meta.code); if (!room) return;
  room.players.delete(meta.id);
  if (room.authority) room.authority.delete(meta.id);
  if (meta.role === 'host') {
    broadcast(room, { type: 'roomClosed', message: 'The host left the room.' });
    for (const c of room.players.values()) if (c.meta) c.meta = null;
    room.players.clear(); rooms.delete(meta.code); return;
  }
  broadcast(room, { type: 'playerLeft', playerId: meta.id, name: meta.name, count: room.players.size });
  if (room.players.size === 0) rooms.delete(meta.code);
}
function closeClient(client) {
  if (!client || client.readyState === 3) return;
  client.readyState = 3; removeClient(client); clients.delete(client);
  try { client.socket.end(wsFrame(Buffer.alloc(0), 0x8)); } catch (_) {}
}

function handlePacket(client, msg) {
  if (!msg || typeof msg.type !== 'string') return;
  if (msg.type === 'host') {
    if (client.meta) removeClient(client);
    const code = newCode(), id = newPlayerId(), name = cleanName(msg.name);
    const room = { code, hostId: id, players: new Map(), authority: new Map() };
    client.meta = { code, role: 'host', id, name }; room.players.set(id, client); rooms.set(code, room);
    send(client, { type: 'hosted', code, id, playerId: id, players: roomRoster(room), maxPlayers: MAX_PLAYERS });
    return;
  }
  if (msg.type === 'join') {
    if (client.meta) removeClient(client);
    const code = String(msg.code || '').replace(/\D/g, '').slice(0, 8), room = rooms.get(code);
    if (!room) { send(client, { type: 'error', message: 'Room code not found. Check the digits and try again.' }); return; }
    if (room.players.size >= MAX_PLAYERS) { send(client, { type: 'error', message: 'That room is full (maximum 6 players).' }); return; }
    const id = newPlayerId(), name = cleanName(msg.name);
    client.meta = { code, role: 'guest', id, name }; room.players.set(id, client);
    const existingPlayers = roomRoster(room).filter(p => p.id !== id);
    send(client, { type: 'joined', code, id, playerId: id, players: existingPlayers, maxPlayers: MAX_PLAYERS });
    broadcast(room, { type: 'playerJoined', player: playerInfo(client), count: room.players.size }, id);
    return;
  }
  const meta = client.meta;
  if (!meta) { send(client, { type: 'error', message: 'Host or join a room first.' }); return; }
  const room = rooms.get(meta.code);
  if (!room) { send(client, { type: 'error', message: 'This room no longer exists.' }); return; }
  if (msg.type === 'state' && msg.state && typeof msg.state === 'object') {
    const accepted = acceptAuthoritativeState(room, meta, msg.state);
    if (!accepted) return;
    // The room server, not the receiving browser, chooses authoritative HP,
    // death and status values. Pose/animation remain client-predicted and are
    // range/speed checked before they become the shared room snapshot.
    send(client, { type: 'serverSelfState', state: ownerState(accepted), serverAt: Date.now() });
    broadcast(room, { type: 'peerState', playerId: meta.id, state: publicState(accepted), serverAt: Date.now() }, meta.id);
  } else if (msg.type === 'event' && msg.event && typeof msg.event === 'object') {
    const targetId = typeof msg.targetId === 'string' ? msg.targetId : '';
    const event = acceptAuthoritativeEvent(room, meta, targetId, msg.event);
    if (!event) return;
    // Events are validated and committed to the room's authoritative combat
    // ledger before clients are told to render/apply them.
    broadcast(room, { type: 'peerEvent', playerId: meta.id, targetId, event, serverAt: Date.now() }, meta.id);
    if (targetId !== '*' && room.players.has(targetId)) {
      const targetClient = room.players.get(targetId), targetState = room.authority.get(targetId);
      if (targetClient && targetState) send(targetClient, { type: 'serverSelfState', state: ownerState(targetState), serverAt: Date.now() });
    }
  } else if (msg.type === 'visuals' && msg.visuals && typeof msg.visuals === 'object') {
    broadcast(room, { type: 'peerVisuals', playerId: meta.id, visuals: msg.visuals, serverAt: Date.now() }, meta.id);
  } else if (msg.type === 'ping') send(client, { type: 'pong', at: Date.now(), sentAt: Number(msg.sentAt) || null });
}


// ---------------------------------------------------------------------------
// Server-authoritative multiplayer ledger.
// The server owns shared combat outcomes (HP, faint state, status timers and
// target stages) and validates position snapshots before relaying them. Local
// clients still predict movement and draw the original pixel-art engine.
// ---------------------------------------------------------------------------
const WORLD = { w: 480, h: 300, minX: 24, maxX: 456, minY: 40, maxY: 286 };
const STATUS_KEYS = new Set(['sleep','psn','burn','seed','slow','root','stag','grabbed']);
const MOVE_KEYS = new Set([
  'vinewhip','leechseed','razorleaf','poisonpowder','sleeppowder','magicalleaf','synthesis','sludgewave','solarbeam',
  'ember','tackle','smokescreen','dragonbreath','firefang','firespin','flamethrower','airslash','flareblitz','dragonrush','bite',
  'watergun','bubblebeam','aquaring','icywind','aquajet','hydropump','irondefense','liquidation','gust','tailwind','quickattack',
  'thunderbolt','thunderwave','electroball','bugbuzz','drillrun','drillpeck','xscissor','brutalswing','hurricane','surf','razorwind','wingattack','aerialace','bravebird','furyattack','irontail','poisonjab','suckerpunch','twister','volttackle'
]);
const lastCombatEvent = new Map();
function finite(n, fallback) { n = Number(n); return Number.isFinite(n) ? n : fallback; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function cleanStatus(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const [key, value] of Object.entries(input)) {
    if (!STATUS_KEYS.has(key) || !value || typeof value !== 'object') continue;
    const t = clamp(finite(value.t, 0), 0, 30);
    if (t > 0) out[key] = { t };
  }
  return out;
}
function cleanStages(input) {
  const out = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  if (!input || typeof input !== 'object') return out;
  for (const k of Object.keys(out)) out[k] = clamp(finite(input[k], 0), -6, 6);
  return out;
}
function acceptAuthoritativeState(room, meta, incoming) {
  const now = Date.now();
  const prev = room.authority.get(meta.id);
  const pokemon = String(incoming.pokemon || 'bulbasaur').slice(0, 32);
  let maxhp = clamp(Math.round(finite(incoming.maxhp, prev ? prev.maxhp : 100)), 1, 10000);
  const speciesChanged = !!prev && prev.pokemon !== pokemon;
  let x = clamp(finite(incoming.x, prev ? prev.x : WORLD.w * .5), WORLD.minX, WORLD.maxX);
  let y = clamp(finite(incoming.y, prev ? prev.y : WORLD.h * .55), WORLD.minY, WORLD.maxY);
  let corrected = false;
  if (prev && !prev.dead && !speciesChanged) {
    const elapsed = clamp((now - prev.receivedAt) / 1000, 0.025, 0.75);
    const dx = x - prev.x, dy = y - prev.y;
    // Allows normal walking, fast dashes and latency bursts, but rejects
    // impossible teleports. Correction is sent only when an actual violation occurs.
    const maxTravel = 1100 * elapsed + 24;
    if (Math.hypot(dx, dy) > maxTravel) { x = prev.x; y = prev.y; corrected = true; }
  }
  let hp = prev ? prev.hp : clamp(finite(incoming.hp, maxhp), 0, maxhp);
  if (speciesChanged) { hp = maxhp; }
  if (!prev) hp = clamp(finite(incoming.hp, maxhp), 0, maxhp);
  const status = prev ? prev.status : cleanStatus(incoming.status);
  // Stage updates are accepted only in the bounded -6..+6 domain and then
  // persisted server-side, so peer snapshots all use the same normalized values.
  const stages = cleanStages(incoming.stages || (prev && prev.stages));
  const dead = hp <= 0 || (prev && prev.dead && now < (prev.respawnAt || 0));
  const state = {
    ...(prev || {}),
    id: meta.id,
    name: String(incoming.name || meta.name || 'Trainer').replace(/[<>\u0000-\u001f]/g,'').slice(0,20),
    pokemon, x, y,
    row: clamp(Math.round(finite(incoming.row, 0)), 0, 7),
    anim: typeof incoming.anim === 'string' ? incoming.anim.slice(0, 24) : 'Idle',
    frame: clamp(Math.round(finite(incoming.frame, 0)), 0, 64),
    t: clamp(finite(incoming.t, 0), 0, 100), once: !!incoming.once,
    hp, maxhp, body: clamp(finite(incoming.body, 10), 1, 100), sh: clamp(finite(incoming.sh, 9), 1, 100),
    z: clamp(finite(incoming.z, 0), -200, 200), hidden: !!incoming.hidden,
    types: Array.isArray(incoming.types) ? incoming.types.slice(0, 4).map(v => String(v).slice(0, 16)) : [],
    stats: incoming.stats && typeof incoming.stats === 'object' ? boundedNumbers(incoming.stats, ['hp','atk','def','spa','spd','spe'], 1, 10000) : {},
    stages: cleanStages(stages), buffs: cleanObject(incoming.buffs, 24), dash: cleanObject(incoming.dash, 12),
    channel: cleanObject(incoming.channel, 24), curSlot: cleanObject(incoming.curSlot, 24),
    locked: !!incoming.locked, noMove: !!incoming.noMove, speedMul: clamp(finite(incoming.speedMul, 1), 0, 8),
    hurtT: clamp(finite(incoming.hurtT, 0), 0, 5), status: cleanStatus(status), dead: !!dead,
    netSlide: cleanObject(incoming.netSlide, 12), netHurricane: cleanObject(incoming.netHurricane, 12),
    receivedAt: now, corrected, respawnAt: prev && prev.respawnAt || 0
  };
  if (speciesChanged) state.dead = false;
  if (state.hp <= 0 && !state.respawnAt) state.respawnAt = now + 1800;
  room.authority.set(meta.id, state);
  return state;
}
function boundedNumbers(input, keys, lo, hi) {
  const out = {};
  for (const key of keys) if (input[key] != null) out[key] = clamp(finite(input[key], lo), lo, hi);
  return out;
}
function cleanObject(input, maxKeys) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out = {};
  for (const [key, value] of Object.entries(input).slice(0, maxKeys)) {
    if (typeof value === 'number') out[key] = clamp(finite(value, 0), -10000, 10000);
    else if (typeof value === 'boolean' || value === null || typeof value === 'string') out[key] = typeof value === 'string' ? value.slice(0, 80) : value;
    else if (Array.isArray(value)) out[key] = value.slice(0, 32).map(v => typeof v === 'number' ? clamp(finite(v,0),-10000,10000) : typeof v === 'string' ? v.slice(0,80) : v);
    else if (value && typeof value === 'object') out[key] = cleanObject(value, 16);
  }
  return out;
}
function publicState(s) {
  const out = {};
  for (const k of ['name','pokemon','x','y','row','anim','frame','t','once','hp','maxhp','body','sh','z','hidden','types','stats','stages','buffs','dash','channel','curSlot','locked','noMove','speedMul','hurtT','status','dead','netSlide','netHurricane']) out[k] = s[k];
  return out;
}
function ownerState(s) {
  return { hp: s.hp, maxhp: s.maxhp, dead: s.dead, status: s.status, stages: s.stages,
    ...(s.corrected ? { corrected: true, x: s.x, y: s.y } : {}),
    ...(s.respawnedAt ? { respawn: true, x: s.x, y: s.y } : {}) };
}
function acceptAuthoritativeEvent(room, meta, targetId, raw) {
  const ev = cleanObject(raw, 32);
  if (!ev || typeof ev.kind !== 'string') return null;
  ev.kind = ev.kind.slice(0, 40);
  if (targetId === '*') return new Set(['hurricaneField','tailwind','wind','field','globalVisual']).has(ev.kind) ? ev : null;
  if (targetId === '') return null; // A combat event without a specific target is ambiguous and is rejected.
  const target = room.authority.get(targetId);
  if (!target || targetId === meta.id) return null;
  if (target.dead && ev.kind !== 'status') return null;
  if (ev.kind === 'damage') {
    // Direct move hits must report impact coordinates close to both players'
    // latest server-accepted poses. Damage-over-time / recoil events do not
    // carry a move key and intentionally skip this geometric check.
    if (ev.move) {
      if (!MOVE_KEYS.has(String(ev.move))) return null;
      const attacker = room.authority.get(meta.id);
      const nums = [ev.fromX, ev.fromY, ev.targetX, ev.targetY];
      if (!attacker || nums.some(v => !Number.isFinite(Number(v)))) return null;
      const ax = Number(ev.fromX), ay = Number(ev.fromY), tx = Number(ev.targetX), ty = Number(ev.targetY);
      if (Math.hypot(ax - attacker.x, ay - attacker.y) > 90) return null;
      if (Math.hypot(tx - target.x, ty - (target.y - target.body)) > 115) return null;
      const meleeRanges = { tackle: 58, bite: 66, firefang: 76, flareblitz: 105, dragonrush: 145, aquajet: 118, liquidation: 82, quickattack: 135, xscissor: 80, brutalswing: 100, drillrun: 140, wingattack: 100, peck: 85 };
      if (Math.hypot(tx - ax, ty - ay) > (meleeRanges[ev.move] || 520)) return null;
    }
    const amount = Math.round(clamp(finite(ev.amount, 0), 0, Math.max(1, target.maxhp)));
    if (!amount || target.hp <= 0) return null;
    const rateKey = `${meta.id}:${targetId}:damage`, now = Date.now();
    const rec = lastCombatEvent.get(rateKey) || { at: 0, count: 0 };
    if (now - rec.at > 1000) { rec.at = now; rec.count = 0; }
    if (rec.count >= 24) return null;
    rec.count++; lastCombatEvent.set(rateKey, rec);
    target.hp = Math.max(0, target.hp - amount);
    target.dead = target.hp <= 0;
    if (target.dead && !target.respawnAt) target.respawnAt = now + 1800;
    ev.amount = amount;
    ev.authority = { hp: target.hp, maxhp: target.maxhp, dead: target.dead };
  } else if (ev.kind === 'status') {
    const key = String(ev.key || ''); if (!STATUS_KEYS.has(key)) return null;
    const active = !!ev.active;
    if (active) target.status[key] = { t: clamp(finite(ev.duration, 1), 0.05, 30) };
    else delete target.status[key];
    ev.authority = { status: target.status };
  } else if (ev.kind === 'stages') {
    target.stages = cleanStages(ev.stages);
    ev.authority = { stages: target.stages };
  } else if (ev.kind === 'launch' || ev.kind === 'bump' || ev.kind === 'wind' || ev.kind === 'tailwind') {
    for (const k of ['vx','vy','duration','wall','land','bounce']) if (ev[k] != null) ev[k] = clamp(finite(ev[k], 0), -1200, 1200);
    if (ev.duration != null) ev.duration = clamp(ev.duration, 0.05, 8);
  }
  return ev;
}
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    for (const [id, state] of room.authority || []) {
      const dt = clamp((now - (state.tickAt || now)) / 1000, 0, 0.25); state.tickAt = now;
      for (const key of Object.keys(state.status || {})) {
        state.status[key].t -= dt;
        if (state.status[key].t <= 0) delete state.status[key];
      }
      if (state.dead && state.respawnAt && now >= state.respawnAt) {
        state.dead = false; state.hp = state.maxhp; state.respawnAt = 0; state.x = 55 + Math.random() * (WORLD.w - 110);
        state.y = 65 + Math.random() * (WORLD.h - 90); state.respawnedAt = now; state.corrected = false;
        const owner = room.players.get(id);
        if (owner) send(owner, { type: 'serverSelfState', state: ownerState(state), serverAt: now });
      }
      if (state.respawnedAt && now - state.respawnedAt > 500) state.respawnedAt = 0;
      // Periodic canonical snapshots make HP/status convergence independent of
      // which peer happened to send the latest pose packet.
      const packet = { type: 'peerState', playerId: id, state: publicState(state), serverAt: now };
      broadcast(room, packet, id);
    }
  }
}, 100);

function consumeFrames(client, chunk) {
  client.buffer = Buffer.concat([client.buffer, chunk]);
  while (client.buffer.length >= 2) {
    const b0 = client.buffer[0], b1 = client.buffer[1], opcode = b0 & 0x0f, masked = !!(b1 & 0x80);
    let length = b1 & 0x7f, offset = 2;
    if (length === 126) { if (client.buffer.length < 4) return; length = client.buffer.readUInt16BE(2); offset = 4; }
    else if (length === 127) { if (client.buffer.length < 10) return; const bigLength = client.buffer.readBigUInt64BE(2); if (bigLength > BigInt(MAX_PAYLOAD)) { closeClient(client); return; } length = Number(bigLength); offset = 10; }
    if (length > MAX_PAYLOAD) { closeClient(client); return; }
    const maskBytes = masked ? 4 : 0; if (client.buffer.length < offset + maskBytes + length) return;
    let payload = client.buffer.subarray(offset + maskBytes, offset + maskBytes + length);
    if (masked) { const mask = client.buffer.subarray(offset, offset + 4); payload = Buffer.from(payload); for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3]; }
    client.buffer = client.buffer.subarray(offset + maskBytes + length);
    if (opcode === 0x8) { closeClient(client); return; }
    if (opcode === 0x9) { try { client.socket.write(wsFrame(payload, 0xA)); } catch (_) {} continue; }
    if (opcode !== 0x1) continue;
    try { handlePacket(client, JSON.parse(payload.toString('utf8'))); } catch (_) { send(client, { type: 'error', message: 'Invalid game message.' }); }
  }
}

server.on('upgrade', (req, socket, head) => {
  if ((req.url || '').split('?')[0] !== '/ws') { socket.write('HTTP/1.1 404 Not Found\r\n\r\n'); socket.destroy(); return; }
  const key = req.headers['sec-websocket-key'];
  if (!key || req.headers.upgrade?.toLowerCase() !== 'websocket') { socket.write('HTTP/1.1 400 Bad Request\r\n\r\n'); socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  const client = { socket, readyState: 1, meta: null, buffer: Buffer.alloc(0) }; clients.add(client);
  socket.on('data', chunk => consumeFrames(client, chunk)); socket.on('close', () => closeClient(client)); socket.on('error', () => closeClient(client));
  if (head && head.length) consumeFrames(client, head);
});
server.listen(PORT, '0.0.0.0', () => {
  console.log(`PMD Arena is running on http://localhost:${PORT}`);
  console.log(`Rooms support up to ${MAX_PLAYERS} players. For Hamachi/LAN, friends use http://YOUR-HOST-IP:${PORT}`);
  console.log('Allow Node.js through the firewall on TCP port ' + PORT + '.');
});
