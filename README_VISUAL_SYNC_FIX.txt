PMD Arena — Multiplayer Visual Sync Fix

This update is based on the six-player 90ms smooth build.

Focused fixes:
- Remote Fire/Dragon/Bubble streams no longer get a synthetic straight beam layered over the caster's actual particles/projectiles.
- Increased the shared particle snapshot capacity so full Powder, Sleep Powder, Glare, Icy Wind and breath trails are much less likely to be clipped in multiplayer.
- Smoke Screen emits its initial cast puff but no longer emits repeated smoke at the invisible player's moving position.
- Dragon Rush uses purple pixel/star trails instead of parallel lines, with purple charge particles during its windup; its catch throws the target toward the caster's cursor with increased force.
- Squirtle and Wartortle Bubble Beam emit up to 10 actual damage-capable bubbles across a 5-second hold. Releasing early sets cooldown proportional to the number of bubbles (0.5 seconds per bubble).
- Hydro Pump's remote twin beam is wider and cleaner, follows the cursor more quickly, and avoids duplicate per-frame laser overlays.
- Pikachu Thunderbolt hold duration is reduced to 2 seconds.
- Beedrill Drill Run charge is 0.5 seconds; Fearow Drill Peck launches after 10 landed hits; Tailwind's push is stronger.

Validation:
- JavaScript syntax checks and ZIP integrity checks passed.
- This package has not been tested in a full multi-browser battle. Please test two-player visuals and combat before deploying; server relays and rendering can behave differently under real network conditions.

Follow-up completion patch:
- Hurricane now holds caught projectiles in a stable orbit, then releases them outward; players orbit the tornado rather than being pulled into its center and are launched on release.
- Surf rider effect is a layered pixel-art wave crest instead of parallel line trails.
- Beedrill X-Scissor and Arbok Brutal Swing advance only on successful hits; their finishing push/grab requires a landed combo.
- Ekans Brutal Swing knockback is stronger, and Poison Jab/Brutal Swing use a purple poison-style visual accent.
- Beedrill Drill Run has a clearer 0.5-second charge, a visible steel sparkle aura, and faster cursor steering.
- Remote effect snapshots allow a little more headroom for busy powder and breath effects.

Final follow-up:
- Blastoise Surf now lasts up to 3 seconds and uses a layered wave-crest rider effect.
- Wartortle Aqua Jet stops after its first confirmed hit and applies stronger directional knockback.
- Fearow Drill Peck description matches its 10-hit launch threshold.
- Venusaur basic attack cooldown is 2 seconds.
- Arbok swing chain resets on misses; the grab hold has a rotating purple poison slash effect and stronger throw.
- Laser Focus has a clearer steel ring and sparkle visual.
- Remote breath fallback renders particle cones rather than a straight purple/orange beam.

Additional completed mechanics:
- Gust now emits a synchronized directional push event with wall-impact damage instead of relying only on a local lane effect; mirror-side movement is not simulated twice.
- Wartortle can hold LMB to fire Bubble Beam while riding Aqua Jet; the concurrent bubble stream remains real projectiles and its cooldown scales by the number of bubbles fired. Aqua Jet ends on a confirmed hit.
