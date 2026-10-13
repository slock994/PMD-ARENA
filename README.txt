PMD Arena - Six Player Network-Optimized Build

LOCAL / LAN / HAMACHI
1. Install Node.js LTS.
2. Run start-server.bat.
3. Open http://localhost:8080 on the host computer.
4. Friends open http://HOST-IP:8080 (or the host's Hamachi IP) and join using the room code.

NETWORK-LAG OPTIMIZATIONS
- Visual snapshots contain fewer recent particles/effects.
- Removed extra JSON deep-clones before sending snapshots.
- The server serializes each broadcast once instead of once per recipient.
- If a connection falls behind, stale state/visual snapshots are dropped rather than queued; combat events are not dropped by this guard.

FREE ONLINE HOSTING (RENDER)
This project already serves both the website and /ws WebSocket endpoint from server.js.
1. Put the contents of this folder into a GitHub repository (keep server.js, package.json, index.html, css/, and js/ at the repository root).
2. In Render, choose New -> Web Service and connect that repository.
3. Choose Frankfurt, Germany as the region for players in/near Europe.
4. Build command: npm install
5. Start command: npm start
6. Choose the Free instance and deploy. Share the resulting https://...onrender.com URL with players; the client will use secure wss:// automatically.

Render's free service can spin down after 15 minutes without inbound traffic, and may restart during maintenance/deploys. The first visit after an idle period can take about a minute. Active game WebSocket messages count as inbound traffic, but free hosting cannot guarantee zero lag or uninterrupted sessions.

This is a hobby build, not a fully load-tested production server. Keep a backup and test with all intended players before switching the live website.

SMOOTHNESS / SYNC UPDATE
- Player snapshots are sent at 50 Hz, visuals at about 15 Hz, and positions are buffered client-side for ~70 ms interpolation.
- Position rendering interpolates/extrapolates slightly instead of snapping to every packet.
- Remote projectile/effect snapshots are rendered for every remote player, not only the selected target.
- Network state includes status/movement flags and aim data for remote effects.
- Stale queued snapshots are dropped earlier on congested links; hit/combat event packets are not dropped by the snapshot guard.

This reduces jitter and fixes missing remote-player visual effects, but ping/CPU limitations can still cause lag. Test with multiple browsers before deploying.


Latest smoothness and balance update: state snapshots are sent at up to 60 Hz and visuals at 20 Hz with smaller effect snapshots. Active Flamethrower/Dragon Breath streams are drawn for remote clients. The arena is now full-width with horizontal move cards below it.

Move changes in this build include: remote breath-stream rendering, Dragon Rush charge-up, water twin-beam channel, steerable Wartortle Aqua Jet, expanded leaf/ember/seed travel, updated requested cooldowns, stronger Gust/Tailwind wall impacts, and multi-client Hurricane pull fields.

UI update: arena spans the full workspace, move buttons are laid out horizontally below the arena, Pokémon stats and dummy options are below the move list, and debug/cheat controls are at the bottom.

Further fixes: remote fire/dragon breath beams and Blastoise water beams render for opponents; Hydro Pump beam length grows over time and can splash near walls; Hurricane field events are broadcast to all clients and distort laser paths; Fearow Drill Run now steers, grabs for seven hits, then throws.

90 MS LATENCY SMOOTHNESS PASS
- Player/animation state is sent at 40 Hz and visual/effect snapshots at 30 Hz to balance responsiveness against six-player packet load.
- Each player's estimated RTT is included in snapshots; remote snapshot times are backdated by estimated sender-to-server plus server-to-receiver transit time.
- Remote movement uses a short capped forward prediction and arena-boundary clamping, with prediction reduced when a player is idle/dead.
- The combat target mirror follows the same predicted position used for rendering, reducing attacks resolving against visibly old positions.
- Remote animation frames advance from snapshot animation timing rather than freezing at the last received frame.
- Remote projectiles/effects advance their visual age and moving projectiles are predicted forward by estimated packet age.
- Ping uses a rolling median and smoothed RTT estimate to reduce jitter from one noisy sample.

No browser game can eliminate the physical delay of a 90 ms round trip. This update attempts to hide most of the transit delay through prediction and interpolation; fast direction changes, collisions, and grabs still need real multi-client testing.

SERVER-AUTHORITATIVE MULTIPLAYER UPDATE
---------------------------------------
The room server now keeps a canonical per-player combat ledger. Shared HP,
faint/respawn timing, status durations, stat stages, and accepted player poses
are reconciled by server.js; clients consume server-committed damage/status
results rather than independently subtracting HP when an authoritative result
is present. The server rejects ambiguous untargeted combat events, caps damage
and event frequency, bounds state fields, clamps arena positions, and rejects
impossible position jumps. It emits periodic canonical snapshots so peers
converge even if one update is delayed.

The existing browser engine is retained for responsive movement prediction and
pixel-art rendering. The server is not a headless port of every move's hitbox,
projectile physics, or animation code; clients still predict movement and report
move contact, which the server reconciles into shared combat state. This update
reduces HP/status desync and rejects some invalid state updates, but it cannot
remove network latency or claim full server-side hit detection for every move.
