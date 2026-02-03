# Game Engine Audit Report

**Scope:** Core logic, state management, physics/math. No CSS/Tailwind/visual changes.

---

## 1. Files Responsible for Game Engine

| File | Role |
|------|------|
| **`src/store/gameStore.ts`** | Central state (Zustand): game phase, threats, batteries, projectiles, explosions, wave spawn queue, combo, scoring, city hits, radar detection, battery targeting, laser heat, wave complete. Single `update(deltaTime, currentTime)` drives one atomic `set()` per frame. |
| **`src/lib/game/physics.ts`** | Distance/distanceSq, segmentIntersectsCircle, isInRange, findClosestThreatInRange, updateThreatPosition, updateProjectilePosition, checkProjectileHit, checkThreatReachedCity, updateExplosion/updateExplosionImmutable, isValidPlacement, screenToCanvas, getEffectiveReloadTime, getAmmoPoolForUpgrade. |
| **`src/lib/game/entities.ts`** | Types (Threat, Battery, Projectile, Explosion, City, Radar, GameState, etc.), createThreat/createBattery/createProjectile/createExplosion/createInitialGameState, getThreatReward/getMoraleDamageForThreat, isInNavalRadarSector, isRadarBySea, createRadar. |
| **`src/lib/game/objectPool.ts`** | Projectile pool: acquire/release/getActive, avoids GC pressure from frequent projectile creation. |
| **`src/lib/game/waves.ts`** | Wave configs (WAVES, getWaveConfig): threat counts, spawnInterval (ms), description. |
| **`src/lib/game/gameConfigLoader.ts`** | getGameConfig() merging GAME_CONFIG with DB overrides. |
| **`src/lib/constants.ts`** | GAME_CONFIG: speeds, ranges, rewards, morale damage, LASER maxHeatTime/cooldown, etc. |
| **`src/components/game/GameWithLeaflet.tsx`** | Game loop: requestAnimationFrame, deltaTime = (currentTime - previousTime) / 16.67 capped at 3, calls `update(deltaTime, currentTime)` when phase === 'playing'. Subscribes to store for render. |

---

## 2. Logical Bugs Found and Fixed

### 2.1 Spawn timer not in true milliseconds (fixed)
- **Issue:** `nextSpawnTimer = s.waveSpawnQueue.spawnTimer + deltaTime * 16` uses a frame-based approximation (16 ≈ 1000/60). At 60fps this is ~0.4% slow; at other frame rates spawn intervals drift from config (e.g. 4500 ms).
- **Fix:** Use `deltaMs` (already computed as `deltaTime * (1000/60)`) so spawn timer is in real milliseconds and spawn intervals match config exactly.

### 2.2 activeEvent expiry caused a second set() (fixed)
- **Issue:** When an active event expired, `update()` called `set({ activeEvent: null, activeEventStartedAt: null })` before the main game `set()`, causing two state updates and potential double render in one frame.
- **Fix:** Clear expired event inside the single atomic `set()` and include `activeEvent` / `activeEventStartedAt` in both return paths (city-hit early return and main return).

### 2.3 City-hit frame skipped spawn timer (fixed)
- **Issue:** On the early return when `cityHitPairs.length > 0`, the returned state did not include `waveSpawnQueue`. So the spawn timer did not advance that frame, delaying the next spawn by one frame.
- **Fix:** Include `waveSpawnQueue: waveSpawnQueueNext` (and event expiry fields) in the city-hit return so spawn timing stays consistent.

### 2.4 Tie-breaker: same-frame city hit vs interception
- **Design choice (no code change):** When a threat reaches a city and a projectile would hit that threat in the same frame, the game processes city hit first (threat removed, morale damage applied). The projectile then finds the threat gone and is released as “reached” with no interception. This is intentional: city hit wins. Documented for clarity.

---

## 3. State Update and Performance

### 3.1 Already good
- **Single atomic update:** One `set(s => { ... return { ... }; })` per frame for all game logic (spawn, move, detect, city hit, battery target, projectiles, laser, explosions, combo, wave complete). No mid-frame state writes.
- **Projectile pool:** Object pool for projectiles reduces allocations and GC.
- **Immutable explosion updates:** `updateExplosionImmutable` used in store so explosion state is replaced, not mutated in place.
- **Closure over deltaMs/deltaTime:** `update(deltaTime, currentTime)` computes `deltaMs` once; the big `set()` uses it from closure (no extra reads).

### 3.2 Optimizations applied
- **Fewer set() calls:** Event expiry and spawn timer fix remove an extra `set()` and keep spawn queue consistent on city-hit frames, reducing redundant renders and keeping timing correct.

### 3.3 Optional future improvements (not required for this audit)
- **Selector usage:** Components already use narrow selectors (e.g. `useGameStore(state => state.threats)`). No change needed.
- **projectilePool.getActive():** Called multiple times per frame inside the same `set()`. Could cache `const active = projectilePool.getActive()` once if profiling shows cost; current code is correct.

---

## 4. Collision and Scoring Accuracy

### 4.1 Collision
- **Projectile–threat:** `checkProjectileHit` uses `distanceSq(projectile, threat) <= HIT_RADIUS_SQ` (28²) and only considers `projectile.targetThreatId`, so no cross-hits. Correct.
- **Threat–city:** `checkThreatReachedCity` uses `distanceSq(threat, targetCity) <= CITY_HIT_RADIUS_SQ` (16²) and only the threat’s `targetCityId`. Correct.
- **Radar:** Detection uses circle (and naval sector) with `segmentIntersectsCircle` for fast threats so a threat crossing the circle in one frame is still detected. Correct.
- **Battery acquisition:** `findClosestThreatInRange` uses `isInRange` with acquisition multiplier 1.05 and respects targetTypes/preferTypes. Correct.

### 4.2 Scoring
- **Interception reward:** When a threat is killed (`health - hits <= 0`), `getThreatReward(t.type)` is added once to `newScore` and `newBudget`. Combo multiplier applied: `1 + newCombo * 0.05`. No double-count.
- **Wave complete bonus:** `WAVE_COMPLETE_BONUS` added only when `didWaveComplete` is true. Correct.
- **Miss retry:** On “miss” (hit registered but didMiss), ammo is deducted again and a new projectile is acquired; total 2 ammo for one kill. Intentional.

### 4.3 Physics
- **Threat movement:** `updateThreatPosition` uses `progressStep = (threat.speed * deltaTime) / totalDist`; speeds in constants are per-frame. Consistent.
- **Projectile movement:** `updateProjectilePosition` moves toward target by `projectile.speed` per frame; returns true when at target. Correct.
- **Explosion:** `updateExplosionImmutable` uses `deltaTime` for radius and alpha; same frame units as elsewhere. Correct.

---

## 5. Summary

- **Engine files:** `gameStore.ts`, `physics.ts`, `entities.ts`, `objectPool.ts`, `waves.ts`, `gameConfigLoader.ts`, `constants.ts`, and the game loop in `GameWithLeaflet.tsx`.
- **Bugs fixed:** (1) spawn timer in ms via `deltaMs`, (2) activeEvent expiry inside single `set()`, (3) city-hit return includes `waveSpawnQueue` (and event expiry).
- **Performance:** Single atomic update per frame; no extra set() from event expiry; spawn timer correct on city-hit frames.
- **Collision and scoring:** Logic verified; projectile–threat and threat–city use correct radii and IDs; rewards and combo applied once per kill; wave bonus only on wave complete.
