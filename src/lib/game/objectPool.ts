// Object Pooling for projectiles - מאגר אובייקטים לפרויקטילים
import { Battery, Threat, Projectile, Position } from './entities';
import { getGameConfig } from './gameConfigLoader';

export interface PooledProjectile extends Projectile {
  isActive: boolean;
}

class ProjectilePool {
  private pool: PooledProjectile[] = [];
  private activeSet: Set<PooledProjectile> = new Set();
  private readonly MAX_POOL_SIZE = 200;
  
  constructor() {
    // Pre-allocate some projectiles
    for (let i = 0; i < 50; i++) {
      this.pool.push(this.createProjectile());
    }
  }
  
  private createProjectile(): PooledProjectile {
    return {
      id: '',
      batteryId: '',
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      targetThreatId: '',
      speed: 0,
      angle: 0,
      trailPositions: [],
      isActive: false,
    };
  }
  
  acquire(battery: Battery, threat: Threat): PooledProjectile {
    let projectile = this.pool.pop();
    
    if (!projectile) {
      projectile = this.createProjectile();
    }
    
    // Reset/initialize projectile – origin must be battery position so interceptor visually leaves from the battery
    projectile.id = `projectile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    projectile.batteryId = battery.id;
    projectile.x = battery.x;
    projectile.y = battery.y;
    projectile.startX = battery.x;
    projectile.startY = battery.y;
    projectile.targetX = threat.x;
    projectile.targetY = threat.y;
    projectile.targetThreatId = threat.id;
    projectile.angle = Math.atan2(threat.y - battery.y, threat.x - battery.x);
    projectile.trailPositions = [];
    projectile.isActive = true;
    
    // Set speed based on battery type
    switch (battery.type) {
      case 'shortRange':
        projectile.speed = getGameConfig().SHORT_RANGE.projectileSpeed;
        break;
      case 'mediumRange':
        projectile.speed = getGameConfig().MEDIUM_RANGE.projectileSpeed;
        break;
      case 'longRange':
        projectile.speed = getGameConfig().LONG_RANGE.projectileSpeed;
        break;
      case 'thaad':
        projectile.speed = getGameConfig().THAAD?.projectileSpeed ?? 12;
        break;
      case 'david':
        projectile.speed = getGameConfig().DAVID?.projectileSpeed ?? 11;
        break;
      case 'arrow2':
        projectile.speed = getGameConfig().ARROW2?.projectileSpeed ?? 9;
        break;
      default:
        projectile.speed = getGameConfig().SHORT_RANGE.projectileSpeed;
    }
    
    this.activeSet.add(projectile);
    return projectile;
  }
  
  release(projectile: PooledProjectile): void {
    projectile.isActive = false;
    projectile.trailPositions = [];
    this.activeSet.delete(projectile);
    
    if (this.pool.length < this.MAX_POOL_SIZE) {
      this.pool.push(projectile);
    }
  }
  
  getActive(): PooledProjectile[] {
    return Array.from(this.activeSet);
  }
  
  getActiveCount(): number {
    return this.activeSet.size;
  }
  
  getPoolSize(): number {
    return this.pool.length;
  }
  
  clear(): void {
    this.activeSet.clear();
    // Keep the pool for reuse
  }

  /** Restore active projectiles from a snapshot (e.g. multiplayer guest receiving host state). */
  restoreFromSnapshot(projectiles: Projectile[]): void {
    const active = Array.from(this.activeSet);
    this.activeSet.clear();
    for (const p of active) {
      p.isActive = false;
      p.trailPositions = [];
      if (this.pool.length < this.MAX_POOL_SIZE) this.pool.push(p);
    }
    for (const data of projectiles) {
      let projectile = this.pool.pop();
      if (!projectile) projectile = this.createProjectile();
      projectile.id = data.id;
      projectile.batteryId = data.batteryId;
      projectile.x = data.x;
      projectile.y = data.y;
      projectile.startX = data.startX;
      projectile.startY = data.startY;
      projectile.targetX = data.targetX;
      projectile.targetY = data.targetY;
      projectile.targetThreatId = data.targetThreatId;
      projectile.speed = data.speed;
      projectile.angle = data.angle;
      projectile.trailPositions = Array.isArray(data.trailPositions) ? [...data.trailPositions] : [];
      projectile.isActive = true;
      this.activeSet.add(projectile);
    }
  }
}

// Singleton instance
export const projectilePool = new ProjectilePool();
