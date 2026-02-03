// Battery Strategy Pattern - תבנית אסטרטגיה לסוללות
import { Battery, Threat, BatteryType, ThreatType } from '../entities';
import { getGameConfig } from '../gameConfigLoader';
import { projectilePool, PooledProjectile } from '../objectPool';

export interface BatteryConfig {
  name: string;
  nameHe: string;
  type: 'projectile' | 'laser';
  cost: number;
  reloadCost: number;
  range: number;
  maxAmmo?: number;
  reloadTime?: number;
  projectileSpeed?: number;
  damage: number;
  maxHeat?: number;
  heatPerSecond?: number;
  cooldownTime?: number;
  targetTypes?: ThreatType[];
}

export abstract class BatteryStrategy {
  constructor(public config: BatteryConfig) {}
  
  abstract canFire(battery: Battery): boolean;
  abstract fire(battery: Battery, threat: Threat): PooledProjectile | null;
  abstract update(battery: Battery, deltaTime: number): void;
  
  getReloadCost(): number {
    return this.config.reloadCost;
  }
  
  canTarget(threat: Threat): boolean {
    if (!this.config.targetTypes || this.config.targetTypes.length === 0) {
      return true;
    }
    return this.config.targetTypes.includes(threat.type);
  }
  
  isInRange(battery: Battery, threat: Threat, bonusRange: number = 0): boolean {
    const dx = battery.x - threat.x;
    const dy = battery.y - threat.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.config.range + bonusRange;
  }
}

export class ProjectileStrategy extends BatteryStrategy {
  canFire(battery: Battery): boolean {
    return battery.ammo > 0 && !battery.isReloading;
  }
  
  fire(battery: Battery, threat: Threat): PooledProjectile | null {
    if (!this.canFire(battery)) return null;
    if (!this.canTarget(threat)) return null;
    if (!this.isInRange(battery, threat)) return null;
    
    return projectilePool.acquire(battery, threat);
  }
  
  update(battery: Battery, deltaTime: number): void {
    // Reloading is handled in the main game loop
  }
}

export class LaserStrategy extends BatteryStrategy {
  canFire(battery: Battery): boolean {
    return !battery.isOverheated && battery.heatLevel < (this.config.maxHeat || 100);
  }
  
  fire(battery: Battery, threat: Threat): PooledProjectile | null {
    // Lasers don't create projectiles, they deal continuous damage
    return null;
  }
  
  update(battery: Battery, deltaTime: number): void {
    // Heat management
    if (battery.isActive && !battery.isOverheated) {
      const heatIncrease = (this.config.heatPerSecond || 25) * (deltaTime * 16 / 1000);
      battery.heatLevel = Math.min((this.config.maxHeat || 100), battery.heatLevel + heatIncrease);
      
      if (battery.heatLevel >= (this.config.maxHeat || 100)) {
        battery.isOverheated = true;
        battery.isActive = false;
      }
    }
    
    // Cooldown
    if (battery.isOverheated) {
      battery.cooldownProgress += (deltaTime * 16) / (this.config.cooldownTime || 5000);
      if (battery.cooldownProgress >= 1) {
        battery.isOverheated = false;
        battery.cooldownProgress = 0;
        battery.heatLevel = 0;
      }
    } else if (!battery.isActive && battery.heatLevel > 0) {
      // Passive cooling when not firing
      battery.heatLevel = Math.max(0, battery.heatLevel - 10 * (deltaTime * 16 / 1000));
    }
  }
}

// Battery configurations
export const BATTERY_CONFIGS: Record<BatteryType, BatteryConfig> = {
  shortRange: {
    name: 'Iron Dome',
    nameHe: 'כיפת ברזל',
    type: 'projectile',
    cost: getGameConfig().SHORT_RANGE_COST,
    reloadCost: getGameConfig().SHORT_RANGE_RELOAD_COST,
    range: getGameConfig().SHORT_RANGE.range,
    maxAmmo: getGameConfig().SHORT_RANGE.maxAmmo,
    reloadTime: getGameConfig().SHORT_RANGE.reloadTime,
    projectileSpeed: getGameConfig().SHORT_RANGE.projectileSpeed,
    damage: 100,
    targetTypes: ['rocket'],
  },
  
  mediumRange: {
    name: 'Patriot',
    nameHe: 'פטריוט',
    type: 'projectile',
    cost: getGameConfig().MEDIUM_RANGE_COST,
    reloadCost: getGameConfig().MEDIUM_RANGE_RELOAD_COST,
    range: getGameConfig().MEDIUM_RANGE.range,
    maxAmmo: getGameConfig().MEDIUM_RANGE.maxAmmo,
    reloadTime: getGameConfig().MEDIUM_RANGE.reloadTime,
    projectileSpeed: getGameConfig().MEDIUM_RANGE.projectileSpeed,
    damage: 140,
    targetTypes: ['cruise'],
  },
  
  longRange: {
    name: 'Arrow 3',
    nameHe: 'חץ 3',
    type: 'projectile',
    cost: getGameConfig().LONG_RANGE_COST,
    reloadCost: getGameConfig().LONG_RANGE_RELOAD_COST,
    range: getGameConfig().LONG_RANGE.range,
    maxAmmo: getGameConfig().LONG_RANGE.maxAmmo,
    reloadTime: getGameConfig().LONG_RANGE.reloadTime,
    projectileSpeed: getGameConfig().LONG_RANGE.projectileSpeed,
    damage: 200,
    targetTypes: ['drone', 'cruise', 'ballistic', 'fighter', 'helicopter', 'glide_bomb', 'stealth', 'armored', 'splitter'],
  },
  
  david: {
    name: "David's Sling",
    nameHe: 'דוד',
    type: 'projectile',
    cost: getGameConfig().DAVID_COST,
    reloadCost: getGameConfig().DAVID_RELOAD_COST ?? 95,
    range: getGameConfig().DAVID?.range ?? 110,
    maxAmmo: getGameConfig().DAVID?.maxAmmo ?? 8,
    reloadTime: getGameConfig().DAVID?.reloadTime ?? 1800,
    projectileSpeed: getGameConfig().DAVID?.projectileSpeed ?? 11,
    damage: 165,
    targetTypes: ['drone', 'cruise', 'ballistic', 'fighter', 'helicopter', 'glide_bomb', 'stealth', 'armored', 'splitter'],
  },
  
  thaad: {
    name: 'THAAD',
    nameHe: 'THAAD (סיוע ברית)',
    type: 'projectile',
    cost: getGameConfig().THAAD_COST,
    reloadCost: getGameConfig().THAAD_RELOAD_COST ?? 200,
    range: getGameConfig().THAAD?.range ?? 160,
    maxAmmo: getGameConfig().THAAD?.maxAmmo ?? 20,
    reloadTime: getGameConfig().THAAD?.reloadTime ?? 2500,
    projectileSpeed: getGameConfig().THAAD?.projectileSpeed ?? 12,
    damage: 220,
    targetTypes: ['drone', 'cruise', 'ballistic', 'fighter', 'helicopter', 'glide_bomb', 'stealth', 'armored', 'splitter'],
  },
  
  arrow2: {
    name: 'Arrow 2',
    nameHe: 'חץ 2',
    type: 'projectile',
    cost: getGameConfig().ARROW2_COST,
    reloadCost: getGameConfig().ARROW2_RELOAD_COST ?? 85,
    range: getGameConfig().ARROW2?.range ?? 120,
    maxAmmo: getGameConfig().ARROW2?.maxAmmo ?? 4,
    reloadTime: getGameConfig().ARROW2?.reloadTime ?? 1900,
    projectileSpeed: getGameConfig().ARROW2?.projectileSpeed ?? 9,
    damage: 170,
    targetTypes: ['drone', 'cruise', 'ballistic', 'fighter', 'helicopter', 'glide_bomb', 'stealth', 'armored', 'splitter'],
  },
  
  laser: {
    name: 'Iron Beam',
    nameHe: 'קרן ברזל',
    type: 'laser',
    cost: getGameConfig().LASER_COST,
    reloadCost: 0,
    range: getGameConfig().LASER.range,
    damage: getGameConfig().LASER.damagePerSecond,
    maxHeat: 100,
    heatPerSecond: 100 / (getGameConfig().LASER.maxHeatTime / 1000),
    cooldownTime: getGameConfig().LASER.cooldownTime,
    targetTypes: ['drone', 'cruise'],
  },
};

// Strategy registry
export const BATTERY_STRATEGIES = new Map<BatteryType, BatteryStrategy>();

// Initialize strategies
Object.entries(BATTERY_CONFIGS).forEach(([key, config]) => {
  const batteryType = key as BatteryType;
  if (config.type === 'projectile') {
    BATTERY_STRATEGIES.set(batteryType, new ProjectileStrategy(config));
  } else if (config.type === 'laser') {
    BATTERY_STRATEGIES.set(batteryType, new LaserStrategy(config));
  }
});

export function getBatteryStrategy(type: BatteryType): BatteryStrategy | undefined {
  return BATTERY_STRATEGIES.get(type);
}
