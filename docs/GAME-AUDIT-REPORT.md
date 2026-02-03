# Game Codebase Audit Report

**Role:** Senior Game Architect & Lead QA Engineer  
**Date:** February 2, 2025  
**Scope:** Critical bugs, logic consistency, React/performance, UI/UX polish.

**Applied (non-polish):** Laser overheat, full-coverage drain, city hit `<=`, EventNotification cleanup, batched `set()` + deltaMs, dead code removed. Polish items (miss/reload/combo feedback) left for later.

---

## [Urgent Fixes]

Things that are broken or poorly coded.

### 1. Laser overheat time wrong (critical)

- **Where:** `src/store/gameStore.ts` (laser heat accumulation), `src/lib/constants.ts` (LASER.maxHeatTime: 3000).
- **Issue:** `deltaTime` is in **frame units** (~1 per frame at 60fps), but heat uses `laserHeatPerMs * deltaTime` as if deltaTime were milliseconds. So heat adds ~33.33 per frame → ~2000/sec → overheat in **~1.5 s** instead of **3 s**.
- **Fix:** Convert frame delta to ms for heat only:  
  `const deltaMs = deltaTime * (1000 / 60);`  
  then `newHeat += (battery.heatLevel ?? 0) + (laserConfig.maxHeatTime / laserConfig.maxHeatTime) * deltaMs`  
  i.e. heat per ms = 1 so that 3000 ms → 3000 heat. Or use a single constant:  
  `newHeat += (battery.heatLevel ?? 0) + deltaTime * (1000 / 60);` (1 heat/ms, deltaTime in frames → multiply by ms per frame).

### 2. Full-coverage duration drains ~60× too slowly

- **Where:** `src/store/gameStore.ts` — `newFullCoverageRemaining = Math.max(0, s.fullCoverageRemaining - deltaTime / 1000)`.
- **Issue:** `deltaTime` is in frame units (1 per frame). So you subtract 0.001 per frame → 0.06 per second. A 45 s buff would last 45 / 0.06 ≈ **750 real seconds** instead of 45 s.
- **Fix:** Subtract elapsed seconds per frame:  
  `newFullCoverageRemaining = Math.max(0, s.fullCoverageRemaining - (deltaTime * 16.67) / 1000)`  
  or equivalently `- deltaTime / 60` (so 1 second of real time removes 1 from fullCoverageRemaining).

### 3. City hit boundary is exclusive (edge case)

- **Where:** `src/lib/game/physics.ts` — `checkThreatReachedCity`:  
  `if (distanceSq(threat, targetCity) < CITY_HIT_RADIUS_SQ) return targetCity;`
- **Issue:** Exactly on the radius (`distanceSq === CITY_HIT_RADIUS_SQ`) does not count as a hit. Rare but can feel unfair.
- **Fix:** Use `<=`:  
  `if (distanceSq(threat, targetCity) <= CITY_HIT_RADIUS_SQ) return targetCity;`

### 4. EventNotification: inner timeout not cleared on unmount

- **Where:** `src/components/game/EventNotification.tsx` — `setTimeout(onComplete, 400)` is not stored or cleared.
- **Issue:** If the component unmounts after the 2500 ms timer but before the 400 ms callback, `onComplete` still runs after unmount (stale closure / possible leak).
- **Fix:** Store the second timeout ID and clear both in the effect cleanup.

---

## [Logic Improvements]

Changes to make the game play better.

### 1. Laser heat (see Urgent Fix 1)

Fixing the heat formula restores intended 3 s fire / 5 s cooldown balance.

### 2. Full-coverage duration (see Urgent Fix 2)

Fixing the drain makes “full coverage” seconds match the advertised duration and economy.

### 3. City hit (see Urgent Fix 3)

Using `<=` makes boundary behavior consistent and predictable.

### 4. Single source of truth for deltaTime unit

- **Issue:** `deltaTime` is “frame units” (1 ≈ one frame at 60fps). Some code treats it like ms (e.g. laser heat, full coverage). Spawn timer uses `deltaTime * 16` to approximate ms.
- **Suggestion:** Either:
  - Document the unit clearly and add a small helper, e.g. `deltaMs = deltaTime * (1000/60)`, and use `deltaMs` for all time-in-ms logic (laser heat, full coverage, etc.), or
  - Pass `deltaMs` from the game loop and use it everywhere so there’s no ambiguity.

---

## [Technical Debt]

Code cleanup and best practices.

### 1. Batch game state updates in one `set()`

- **Where:** `src/store/gameStore.ts` — inside `update()`, one `set()` is used for spawning (new threat + spawn queue), then a second large `set()` for the rest of the tick.
- **Issue:** Two `set()` calls per frame can cause two re-renders for store subscribers. Not critical but adds overhead.
- **Fix:** Refactor so the spawn decision and new threat are computed in the same tick, then apply a **single** `set()` that updates threats, waveSpawnQueue, and all other state for that frame.

### 2. Remove or repurpose dead code

- **Files:** `src/hooks/useGameState.ts`, `src/components/game/GameCanvas.tsx`, `src/components/game/GameCanvasZustand.tsx`.
- **Issue:** Main entry uses `GameWithLeaflet` + `useGameStore`. These files duplicate or replace the game loop and are unused, which increases noise and maintenance.
- **Fix:** Delete if truly unused, or document and gate behind a feature flag if kept for experiments.

### 3. Centralize and document deltaTime convention

- **Issue:** Mixing “frame units” and “ms” in different places led to the laser and full-coverage bugs.
- **Fix:** Add a short comment at the top of `gameStore.update(deltaTime, …)` and in the game loop: “deltaTime = frame units (1 ≈ one frame at 60fps). For ms use deltaTime * (1000/60).” Use one helper (e.g. `toDeltaMs(deltaTime)`) for all time-based math.

---

## [Creative Recommendations]

2–3 ideas to make the game more fun.

### 1. Visual “juice” for missed intercepts

- From wave 5 there’s a 10% miss chance and a second missile; the player gets a text notification.
- **Idea:** Add a short visual: e.g. a “פספוס” / “MISS” popup at the impact point, a different (gray/white) burst, or a quick screen shake. Makes misses feel clear and intentional instead of confusing.

### 2. Clearer battery reload state in the action bar

- **Idea:** When a battery is reloading, give its icon a distinct state: e.g. subtle pulse, dimmed or colored border, or a small “reload” progress ring around the icon. Reduces “why didn’t it fire?” and makes reload upgrades more noticeable.

### 3. Light “combo” or streak feedback

- **Idea:** When the player gets 2–3 intercepts in quick succession, add a small on-screen cue: e.g. “x2”, “x3” with a brief scale/glow, or a short sound bump. Doesn’t have to change scoring at first—just makes chains feel more rewarding and encourages active play.

---

## Summary table

| Category              | Item                          | Severity   | Effort |
|-----------------------|-------------------------------|------------|--------|
| Urgent                | Laser overheat time           | Critical   | Small  |
| Urgent                | Full-coverage drain           | Critical   | Small  |
| Urgent                | City hit `<=`                 | Low        | Trivial|
| Urgent                | EventNotification timeout     | Low        | Trivial|
| Logic                 | deltaTime convention          | Medium     | Small  |
| Technical debt         | Single set() per frame        | Medium     | Medium |
| Technical debt         | Dead code                     | Low        | Small  |
| Creative               | Miss feedback                 | Polish     | Small  |
| Creative               | Reload feedback in action bar| Polish     | Small  |
| Creative               | Combo/streak feedback         | Polish     | Small  |

---

*Which of these would you like to apply or fix first?*
