PMD ARENA — SERVER AUTHORITY UPDATE
===================================

What changed
------------
* The room server now keeps a canonical per-player combat ledger for HP,
  faint/respawn timing, status timers, normalized stat stages, and shared poses.
* Damage events update canonical HP on the server before they are broadcast.
  The target uses the server-committed HP, which reduces double-applied hits and
  HP drift when combat messages and snapshots arrive close together.
* Direct move-hit reports include positions. The server checks them against the
  latest server-accepted positions, restricts move identifiers, caps per-hit
  damage, and rate-limits hit reports.
* Status events are committed to the server ledger; periodic canonical snapshots
  keep remote HP/status bars and states converged through short message bursts.
* Impossible pose jumps are rejected and corrected to the last accepted pose.
* Global untargeted damage/status messages are rejected; room still supports six
  participants and the existing visual effects relay.

Important implementation boundary
---------------------------------
This is an authoritative multiplayer core and reconciliation upgrade, not a
complete headless port of every move's attack/collision algorithm. The browser
still predicts movement and renders the existing sprite/particle engine, and
reports move contacts for server validation. The server owns the shared combat
ledger and validates reported impact positions, but it does not independently
re-run every move's unique hitbox/projectile physics. Server authority can reduce
desync but cannot remove real network latency. This boundary is stated explicitly
so the build is not misrepresented as having fully server-simulated hit detection.

Run
---
Use `npm start` or `node server.js`. Render can continue to run the Node server
with the project's existing start command. No external dependencies were added.
