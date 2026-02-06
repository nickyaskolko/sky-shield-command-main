// Physics and collision detection - פיזיקה וזיהוי התנגשויות

import { Battery, Threat, Projectile, City, Position, Explosion, ThreatType } from './entities';
import { getGameConfig } from './gameConfigLoader';
import { pointInIsraelPolygon } from './israelMap';

export function distance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Squared distance - use in hot paths to avoid sqrt (e.g. range checks) */
export function distanceSq(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** True if segment from (ax,ay) to (bx,by) intersects or is inside circle (cx,cy,r). Used for instant radar detection when a fast threat crosses the circle in one frame. */
export function segmentIntersectsCircle(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, r: number
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0) {
    const d = (ax - cx) * (ax - cx) + (ay - cy) * (ay - cy);
    return d <= r * r;
  }
  const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / lenSq));
  const nx = ax + t * dx;
  const ny = ay + t * dy;
  const distSq = (nx - cx) * (nx - cx) + (ny - cy) * (ny - cy);
  return distSq <= r * r;
}

export function isInRange(battery: Battery, threat: Threat, upgradeLevel: number = 0, acquisitionMultiplier: number = 1): boolean {
  const bonusRange = battery.range * getGameConfig().UPGRADE_BONUSES.radarRange * upgradeLevel;
  const effectiveRange = (battery.range + bonusRange) * acquisitionMultiplier;
  return distance(battery, threat) <= effectiveRange;
}

/** 1.0 = יירוט רק בתוך מעגל הטווח של הסוללה (ללא מרחב מעבר) */
const ACQUISITION_RANGE_MULTIPLIER = 1.0;

export function findClosestThreatInRange(
  battery: Battery,
  threats: Threat[],
  upgradeLevel: number = 0,
  targetTypes?: ThreatType[],
  /** When set (e.g. ['drone'] for laser), prefer threats of these types; if none in range, pick closest any. */
  preferTypes?: ThreatType[]
): Threat | null {
  let closest: Threat | null = null;
  let minDist = Infinity;
  let closestPrefer: Threat | null = null;
  let minDistPrefer = Infinity;

  for (const threat of threats) {
    if (battery.type === 'shortRange' && threat.type === 'ballistic') continue;
    if (targetTypes && targetTypes.length > 0 && !targetTypes.includes(threat.type)) continue;
    if (!isInRange(battery, threat, upgradeLevel, ACQUISITION_RANGE_MULTIPLIER)) continue;

    const dist = distance(battery, threat);
    const isPrefer = preferTypes && preferTypes.length > 0 && preferTypes.includes(threat.type);
    if (isPrefer && dist < minDistPrefer) {
      minDistPrefer = dist;
      closestPrefer = threat;
    }
    if (dist < minDist) {
      minDist = dist;
      closest = threat;
    }
  }

  if (closestPrefer != null) return closestPrefer;
  return closest;
}

export function updateThreatPosition(threat: Threat, deltaTime: number): void {
  const totalDist = distance(
    { x: threat.startX, y: threat.startY },
    { x: threat.targetX, y: threat.targetY }
  );
  if (totalDist <= 0) {
    threat.progress = 1;
    threat.x = threat.targetX;
    threat.y = threat.targetY;
    return;
  }
  const progressStep = (threat.speed * deltaTime) / totalDist;
  threat.progress = Math.min(1, threat.progress + progressStep);
  
  // Fixed arc trail: do not update trailPositions; arc is drawn from start to target
  if (threat.type === 'ballistic') {
    // Ballistic arc trajectory
    const t = threat.progress;
    threat.x = threat.startX + (threat.targetX - threat.startX) * t;
    const arcHeight = 150 * Math.sin(t * Math.PI);
    const baseY = threat.startY + (threat.targetY - threat.startY) * t;
    threat.y = baseY - arcHeight;
  } else if (threat.type === 'cruise') {
    // Straight path to target (no zigzag – more realistic)
    threat.x = threat.startX + (threat.targetX - threat.startX) * threat.progress;
    threat.y = threat.startY + (threat.targetY - threat.startY) * threat.progress;
  } else {
    // Drone - straight path
    threat.x = threat.startX + (threat.targetX - threat.startX) * threat.progress;
    threat.y = threat.startY + (threat.targetY - threat.startY) * threat.progress;
  }
  
  // Update angle for rendering
  if (threat.type !== 'ballistic') {
    const dx = threat.targetX - threat.x;
    const dy = threat.targetY - threat.y;
    threat.angle = Math.atan2(dy, dx);
  }
}

export function updateProjectilePosition(projectile: Projectile): boolean {
  // Fixed arc trail: do not update trailPositions; arc drawn from start to target
  const dx = projectile.targetX - projectile.x;
  const dy = projectile.targetY - projectile.y;
  const distSq = dx * dx + dy * dy;
  const dist = Math.sqrt(distSq);
  if (dist <= 0 || dist < projectile.speed || distSq < 1) {
    projectile.x = projectile.targetX;
    projectile.y = projectile.targetY;
    return true;
  }
  const invDist = 1 / dist;
  projectile.x += dx * invDist * projectile.speed;
  projectile.y += dy * invDist * projectile.speed;
  projectile.angle = Math.atan2(dy, dx);
  
  return false;
}

// Hit radius: generous enough to register hits on moving targets (projectile aims at last-known position)
const HIT_RADIUS_SQ = 28 * 28;

export function checkProjectileHit(
  projectile: Projectile,
  threats: Threat[]
): Threat | null {
  for (const threat of threats) {
    if (threat.id === projectile.targetThreatId) {
      if (distanceSq(projectile, threat) <= HIT_RADIUS_SQ) return threat;
    }
  }
  return null;
}

const CITY_HIT_RADIUS = 16; // 15–18px for clearer city hit feedback
const CITY_HIT_RADIUS_SQ = CITY_HIT_RADIUS * CITY_HIT_RADIUS;

export function checkThreatReachedCity(threat: Threat, cities: City[]): City | null {
  const targetCity = cities.find(c => c.id === threat.targetCityId);
  if (!targetCity) return null;
  if (distanceSq(threat, targetCity) <= CITY_HIT_RADIUS_SQ) return targetCity;
  return null;
}

export function updateExplosion(explosion: Explosion, deltaTime: number): boolean {
  const growthRate = 2;
  explosion.radius = Math.min(explosion.maxRadius, explosion.radius + growthRate * deltaTime);
  for (const particle of explosion.particles) {
    particle.x += particle.vx * deltaTime;
    particle.y += particle.vy * deltaTime;
    particle.vx *= 0.98;
    particle.vy *= 0.98;
    particle.vy += 0.1 * deltaTime;
    particle.alpha -= 0.02 * deltaTime;
    particle.radius *= 0.99;
  }
  explosion.alpha -= 0.03 * deltaTime;
  return explosion.alpha <= 0;
}

/** Immutable explosion update for use inside Zustand set() – returns new explosion and done flag. */
export function updateExplosionImmutable(
  explosion: Explosion,
  deltaTime: number
): { updated: Explosion; done: boolean } {
  const growthRate = 2;
  const newRadius = Math.min(explosion.maxRadius, explosion.radius + growthRate * deltaTime);
  const newParticles = explosion.particles.map(p => ({
    ...p,
    x: p.x + p.vx * deltaTime,
    y: p.y + p.vy * deltaTime,
    vx: p.vx * 0.98,
    vy: p.vy * 0.98 + 0.1 * deltaTime,
    alpha: p.alpha - 0.02 * deltaTime,
    radius: p.radius * 0.99,
  }));
  const newAlpha = explosion.alpha - 0.03 * deltaTime;
  return {
    updated: {
      ...explosion,
      radius: newRadius,
      alpha: newAlpha,
      particles: newParticles,
    },
    done: newAlpha <= 0,
  };
}

export interface PlacementValidation {
  isValid: boolean;
  reason?: string;
}

export function isValidPlacement(
  x: number,
  y: number,
  batteries: Battery[],
  cities: City[],
  canvasWidth: number,
  canvasHeight: number,
  newBatteryRange: number = 150
): PlacementValidation {
  const padding = 30;
  
  // Check bounds
  if (x < padding || x > canvasWidth - padding ||
      y < padding || y > canvasHeight - padding) {
    return { isValid: false, reason: 'מחוץ לגבולות המפה' };
  }
  
  // Only allow placement inside Israeli territory
  if (!pointInIsraelPolygon(x, y, canvasWidth, canvasHeight)) {
    return { isValid: false, reason: 'ניתן לפרוס רק בשטח ישראל' };
  }
  
  // Allow placing systems inside other systems' areas (radar/battery overlap).
  const minDistanceFromBattery = 14;
  for (const battery of batteries) {
    const dist = distance({ x, y }, battery);
    if (dist < minDistanceFromBattery) {
      return { isValid: false, reason: '⚠️ קרוב מדי לסוללה קיימת' };
    }
  }
  
  // Check distance from cities – allow closer placement for better gameplay
  const minDistanceFromCity = 10;
  for (const city of cities) {
    if (distance({ x, y }, city) < minDistanceFromCity) {
      return { isValid: false, reason: 'קרוב מדי לעיר' };
    }
  }
  
  return { isValid: true };
}

export function screenToCanvas(
  screenX: number,
  screenY: number,
  canvas: HTMLCanvasElement
): Position {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  return {
    x: (screenX - rect.left) * scaleX,
    y: (screenY - rect.top) * scaleY,
  };
}

export function getEffectiveReloadTime(baseTime: number, upgradeLevel: number): number {
  const reduction = baseTime * getGameConfig().UPGRADE_BONUSES.reloadSpeed * upgradeLevel;
  return Math.max(baseTime * 0.3, baseTime - reduction); // Min 30% of original
}

export function getEffectiveMaxAmmo(baseAmmo: number, upgradeLevel: number): number {
  return baseAmmo + getGameConfig().UPGRADE_BONUSES.maxAmmo * upgradeLevel;
}

/** Initial ammo pool per wave – base 10/0/0 + maxAmmo upgrade bonus; no buy cap (unlimited) */
export function getAmmoPoolForUpgrade(maxAmmoLevel: number): { shortRange: number; mediumRange: number; longRange: number } {
  return {
    shortRange: getEffectiveMaxAmmo(10, maxAmmoLevel),
    mediumRange: getEffectiveMaxAmmo(0, maxAmmoLevel),
    longRange: getEffectiveMaxAmmo(0, maxAmmoLevel),
  };
}
