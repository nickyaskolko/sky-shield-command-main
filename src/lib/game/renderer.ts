// Canvas rendering functions - פונקציות ציור Canvas בסגנון OpenStreetMap

import { 
  Battery, Threat, Projectile, City, Explosion, LaserBeam, Radar,
  getThreatColor, getBatteryColor, getThreatName, ThreatType,
  NAVAL_SEA_ANGLE, NAVAL_SECTOR_HALF,
} from './entities';
import { COLORS, CITY_POSITIONS } from '../constants';
import { getGameConfig } from './gameConfigLoader';

// OSM Style color palette - matching real OpenStreetMap
const OSM_COLORS = {
  // Sea colors
  sea: 'hsl(195, 45%, 82%)', // Light blue like OSM water
  seaDeep: 'hsl(200, 50%, 75%)',
  
  // Land colors - beige/cream like OSM
  land: 'hsl(35, 30%, 90%)', // Default land
  landIsrael: 'hsl(35, 35%, 88%)', // Slightly different for Israel
  landNeighbor: 'hsl(35, 28%, 92%)', // Neighboring countries
  
  // Borders - purple/pink like OSM international borders
  borderInternational: 'hsl(315, 25%, 60%)',
  borderDisputed: 'hsl(315, 20%, 70%)',
  
  // Roads
  roads: 'hsl(45, 10%, 90%)',
  roadsMajor: 'hsl(50, 20%, 85%)',
  
  // Water bodies
  waterBody: 'hsl(195, 50%, 70%)',
  
  // Labels
  labelCity: 'hsl(0, 0%, 20%)',
  labelWater: 'hsl(195, 60%, 35%)',
  
  // Grid
  gridLight: 'hsla(35, 20%, 50%, 0.1)',
};

export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  // OSM-style sea background - uniform light blue
  ctx.fillStyle = OSM_COLORS.sea;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function drawGrid(ctx: CanvasRenderingContext2D): void {
  // Minimal grid for OSM style - very subtle
  const { width, height } = ctx.canvas;
  ctx.strokeStyle = OSM_COLORS.gridLight;
  ctx.lineWidth = 0.3;
  
  // Very light coordinate grid
  const gridSize = 80;
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

export function drawCountryOutline(ctx: CanvasRenderingContext2D): void {
  const { width, height } = ctx.canvas;
  
  ctx.save();
  
  // =============================================
  // MIDDLE EAST REGION - OSM Style
  // Based on the actual OSM view at zoom level 7
  // Showing Israel, Jordan, Lebanon, Syria, Egypt, Sinai
  // =============================================
  
  // Draw ALL land first (neighboring countries) - lighter beige
  const allLandPath = new Path2D();
  allLandPath.rect(0, 0, width, height);
  ctx.fillStyle = OSM_COLORS.landNeighbor;
  ctx.fill(allLandPath);
  
  // Mediterranean Sea (left side) - based on OSM view
  ctx.fillStyle = OSM_COLORS.sea;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width * 0.28, 0); // Northern coast
  ctx.lineTo(width * 0.26, height * 0.08); // Lebanon coast
  ctx.lineTo(width * 0.22, height * 0.18); // Haifa area
  ctx.lineTo(width * 0.20, height * 0.32); // Tel Aviv coast
  ctx.lineTo(width * 0.18, height * 0.42); // Gaza coast
  ctx.lineTo(width * 0.16, height * 0.52); // North Sinai coast
  ctx.lineTo(width * 0.12, height * 0.60); // Port Said area
  ctx.lineTo(0, height * 0.70);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  
  // Red Sea / Gulf of Eilat / Gulf of Aqaba (bottom)
  ctx.fillStyle = OSM_COLORS.sea;
  ctx.beginPath();
  ctx.moveTo(width * 0.38, height);
  ctx.lineTo(width * 0.42, height * 0.88); // Eilat/Aqaba tip
  ctx.lineTo(width * 0.48, height * 0.92);
  ctx.lineTo(width * 0.52, height);
  ctx.closePath();
  ctx.fill();
  
  // =============================================
  // ISRAEL - Main territory (slightly different shade)
  // =============================================
  const israelPath = new Path2D();
  
  // Full Israel silhouette - from Metula to Eilat
  israelPath.moveTo(width * 0.26, height * 0.04); // Metula / Northern border
  israelPath.lineTo(width * 0.30, height * 0.02); // Upper Galilee
  israelPath.lineTo(width * 0.38, height * 0.03); // Golan approach
  israelPath.lineTo(width * 0.44, height * 0.06); // Golan Heights
  israelPath.lineTo(width * 0.46, height * 0.10); // East of Kinneret
  
  // Eastern border - Jordan Valley
  israelPath.lineTo(width * 0.48, height * 0.16); // Sea of Galilee east
  israelPath.lineTo(width * 0.50, height * 0.24); // Beit She'an
  israelPath.lineTo(width * 0.54, height * 0.34); // Jordan Valley
  israelPath.lineTo(width * 0.58, height * 0.44); // Dead Sea north
  israelPath.lineTo(width * 0.58, height * 0.54); // Dead Sea
  israelPath.lineTo(width * 0.56, height * 0.62); // Dead Sea south / Arava
  
  // Negev and Eilat
  israelPath.lineTo(width * 0.50, height * 0.72); // Central Negev
  israelPath.lineTo(width * 0.46, height * 0.80); // Southern Negev
  israelPath.lineTo(width * 0.42, height * 0.88); // Eilat tip
  
  // Western border - Egypt/Gaza/Coast
  israelPath.lineTo(width * 0.36, height * 0.76); // Nitzana
  israelPath.lineTo(width * 0.30, height * 0.62); // Kerem Shalom
  israelPath.lineTo(width * 0.24, height * 0.48); // Gaza border
  israelPath.lineTo(width * 0.20, height * 0.38); // Ashkelon
  israelPath.lineTo(width * 0.20, height * 0.30); // Tel Aviv
  israelPath.lineTo(width * 0.22, height * 0.20); // Netanya
  israelPath.lineTo(width * 0.24, height * 0.12); // Haifa
  israelPath.lineTo(width * 0.26, height * 0.04); // Back to Metula
  
  israelPath.closePath();
  
  ctx.fillStyle = OSM_COLORS.landIsrael;
  ctx.fill(israelPath);
  
  // =============================================
  // WATER BODIES
  // =============================================
  
  // Sea of Galilee (Kinneret)
  ctx.fillStyle = OSM_COLORS.waterBody;
  ctx.beginPath();
  ctx.ellipse(width * 0.42, height * 0.14, width * 0.022, height * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Dead Sea
  ctx.fillStyle = OSM_COLORS.waterBody;
  ctx.beginPath();
  ctx.ellipse(width * 0.54, height * 0.50, width * 0.018, height * 0.055, 0.1, 0, Math.PI * 2);
  ctx.fill();
  
  // =============================================
  // BORDERS - OSM style purple/pink
  // =============================================
  
  ctx.strokeStyle = OSM_COLORS.borderInternational;
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.stroke(israelPath);
  
  // =============================================
  // LABELS
  // =============================================
  
  ctx.font = 'italic 11px Heebo, sans-serif';
  ctx.textAlign = 'center';
  
  // Water labels
  ctx.fillStyle = OSM_COLORS.labelWater;
  ctx.save();
  ctx.translate(width * 0.08, height * 0.35);
  ctx.rotate(-0.2);
  ctx.fillText('הים התיכון', 0, 0);
  ctx.restore();
  
  ctx.font = 'italic 9px Heebo, sans-serif';
  ctx.fillStyle = OSM_COLORS.labelWater;
  ctx.fillText('כנרת', width * 0.42, height * 0.14);
  ctx.fillText('ים המלח', width * 0.54, height * 0.51);
  ctx.fillText('מפרץ אילת', width * 0.44, height * 0.92);
  
  // Country labels (neighboring)
  ctx.fillStyle = 'hsla(0, 0%, 40%, 0.6)';
  ctx.font = '12px Heebo, sans-serif';
  ctx.fillText('לבנון', width * 0.32, height * 0.02);
  ctx.fillText('סוריה', width * 0.56, height * 0.08);
  ctx.fillText('ירדן', width * 0.66, height * 0.45);
  ctx.fillText('מצרים', width * 0.22, height * 0.70);
  ctx.fillText('סיני', width * 0.32, height * 0.82);
  
  ctx.restore();
}

export function drawCity(ctx: CanvasRenderingContext2D, city: City, time: number): void {
  const pulsePhase = (time / 500 + city.pulsePhase) % (Math.PI * 2);
  const pulseScale = 1 + Math.sin(pulsePhase) * 0.15;
  
  const baseRadius = 10;
  const radius = baseRadius * pulseScale;
  
  // City circle - normal color; red border when targeted
  const cityColor = 'hsl(45, 5%, 30%)';
  
  // Outer glow
  const gradient = ctx.createRadialGradient(city.x, city.y, 0, city.x, city.y, radius * 2.5);
  gradient.addColorStop(0, city.isTargeted ? 'hsla(0, 100%, 60%, 0.3)' : 'hsla(45, 10%, 40%, 0.3)');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(city.x, city.y, radius * 2.5, 0, Math.PI * 2);
  ctx.fill();
  
  // City dot
  ctx.fillStyle = cityColor;
  ctx.beginPath();
  ctx.arc(city.x, city.y, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Red border when city is targeted
  if (city.isTargeted) {
    ctx.strokeStyle = 'hsl(0, 80%, 55%)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(city.x, city.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // White center
  ctx.fillStyle = 'hsl(0, 0%, 95%)';
  ctx.beginPath();
  ctx.arc(city.x, city.y, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();
  
  // City name label
  ctx.fillStyle = 'hsl(0, 0%, 20%)';
  ctx.font = 'bold 12px Heebo, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(city.name, city.x, city.y + radius + 16);
}

// Helper to convert HSL to HSLA with alpha
function hslToHsla(hsl: string, alpha: number): string {
  return hsl.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
}

export function drawThreat(ctx: CanvasRenderingContext2D, threat: Threat, time: number): void {
  const color = getThreatColor(threat.type);
  
  // If not detected, draw as ghost/stealth blip (barely visible)
  if (!threat.isDetected) {
    // Very faint indication that something is there
    ctx.fillStyle = 'hsla(0, 0%, 50%, 0.15)';
    ctx.beginPath();
    ctx.arc(threat.x, threat.y, 6, 0, Math.PI * 2);
    ctx.fill();
    return; // Don't draw full threat if not detected
  }
  
  // Fixed arc trail from launch to impact (not moving with threat)
  const dist = Math.hypot(threat.targetX - threat.startX, threat.targetY - threat.startY);
  if (dist > 5) {
    const arcHeight = threat.type === 'ballistic' ? dist * 0.35 : dist * 0.12;
    const midX = (threat.startX + threat.targetX) / 2;
    const midY = (threat.startY + threat.targetY) / 2;
    const perpAngle = Math.atan2(threat.targetY - threat.startY, threat.targetX - threat.startX) - Math.PI / 2;
    const ctrlX = midX + Math.cos(perpAngle) * arcHeight;
    const ctrlY = midY + Math.sin(perpAngle) * arcHeight;
    ctx.strokeStyle = hslToHsla(color, 0.35);
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(threat.startX, threat.startY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, threat.targetX, threat.targetY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Pulsing glow – size by threat type (rocket small, cruise medium, ballistic large)
  const sizeScale = threat.type === 'rocket' ? 0.75 : threat.type === 'cruise' ? 1 : threat.type === 'ballistic' ? 1.35 : 1;
  const pulse = Math.sin(time / 200) * 0.3 + 0.7;
  const glowRadius = 25 * sizeScale * pulse;
  
  const gradient = ctx.createRadialGradient(threat.x, threat.y, 0, threat.x, threat.y, glowRadius);
  gradient.addColorStop(0, hslToHsla(color, 0.6));
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(threat.x, threat.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Threat body - detailed unique shape per type
  ctx.save();
  ctx.translate(threat.x, threat.y);
  ctx.rotate(threat.angle + Math.PI / 2);
  
  ctx.fillStyle = color;
  ctx.strokeStyle = 'hsla(0, 0%, 0%, 0.3)';
  ctx.lineWidth = 1;
  
  switch (threat.type) {
    case 'drone':
      // Drone/UAV - X shape with propellers
      drawDrone(ctx, time);
      break;
      
    case 'ballistic':
      // Ballistic missile - classic rocket with fins
      drawBallisticMissile(ctx, time);
      break;
      
    case 'rocket':
      // Small rocket - compact shape
      drawRocket(ctx);
      break;
      
    case 'cruise':
      // Cruise missile - sleek with wings
      drawCruiseMissile(ctx);
      break;
      
    case 'fighter':
      // Fighter jet - delta wing
      drawFighterJet(ctx);
      break;
      
    case 'helicopter':
      // Attack helicopter with rotor
      drawHelicopter(ctx, time);
      break;
      
    case 'glide_bomb':
      // Glide bomb - diamond shape
      drawGlideBomb(ctx, time);
      break;
      
    default:
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
  }
  
  ctx.restore();
  
  // Threat type label with background
  const label = getThreatName(threat.type);
  ctx.font = 'bold 10px Heebo, sans-serif';
  const labelWidth = ctx.measureText(label).width + 8;
  
  ctx.fillStyle = 'hsla(0, 0%, 0%, 0.6)';
  ctx.fillRect(threat.x - labelWidth / 2, threat.y - 28, labelWidth, 14);
  
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(label, threat.x, threat.y - 17);
  
  // Health bar for multi-health threats
  if (threat.health < threat.maxHealth) {
    const barWidth = 24;
    const barHeight = 4;
    ctx.fillStyle = 'hsla(0, 0%, 0%, 0.5)';
    ctx.fillRect(threat.x - barWidth / 2, threat.y - 34, barWidth, barHeight);
    ctx.fillStyle = 'hsl(0, 80%, 50%)';
    ctx.fillRect(
      threat.x - barWidth / 2, 
      threat.y - 34, 
      barWidth * (threat.health / threat.maxHealth), 
      barHeight
    );
  }
}

// Detailed threat drawing functions
function drawDrone(ctx: CanvasRenderingContext2D, time: number): void {
  // Main body (fuselage)
  ctx.fillStyle = 'hsl(50, 100%, 50%)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // X-shaped wings
  ctx.fillStyle = 'hsl(50, 90%, 40%)';
  ctx.beginPath();
  ctx.moveTo(-10, -5);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-10, 5);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(10, -5);
  ctx.lineTo(3, 0);
  ctx.lineTo(10, 5);
  ctx.closePath();
  ctx.fill();
  
  // Spinning propellers
  const propAngle = (time / 30) % (Math.PI * 2);
  ctx.strokeStyle = 'hsl(50, 80%, 60%)';
  ctx.lineWidth = 2;
  
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.translate(i < 2 ? -7 : 7, i % 2 === 0 ? -4 : 4);
    ctx.rotate(propAngle);
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBallisticMissile(ctx: CanvasRenderingContext2D, time: number): void {
  // Rocket body
  ctx.fillStyle = 'hsl(15, 90%, 55%)';
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(5, -8);
  ctx.lineTo(5, 8);
  ctx.lineTo(0, 12);
  ctx.lineTo(-5, 8);
  ctx.lineTo(-5, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Nose cone
  ctx.fillStyle = 'hsl(0, 0%, 30%)';
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(4, -8);
  ctx.lineTo(-4, -8);
  ctx.closePath();
  ctx.fill();
  
  // Fins
  ctx.fillStyle = 'hsl(15, 80%, 45%)';
  ctx.beginPath();
  ctx.moveTo(-5, 8);
  ctx.lineTo(-9, 14);
  ctx.lineTo(-5, 10);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(5, 8);
  ctx.lineTo(9, 14);
  ctx.lineTo(5, 10);
  ctx.closePath();
  ctx.fill();
  
  // Flame trail
  const flameFlicker = Math.sin(time / 50) * 2;
  ctx.fillStyle = 'hsl(30, 100%, 50%)';
  ctx.beginPath();
  ctx.moveTo(-3, 12);
  ctx.lineTo(0, 18 + flameFlicker);
  ctx.lineTo(3, 12);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = 'hsl(50, 100%, 70%)';
  ctx.beginPath();
  ctx.moveTo(-2, 12);
  ctx.lineTo(0, 15 + flameFlicker);
  ctx.lineTo(2, 12);
  ctx.closePath();
  ctx.fill();
}

function drawRocket(ctx: CanvasRenderingContext2D): void {
  // Small rocket body (Iron Dome target)
  ctx.fillStyle = 'hsl(25, 90%, 55%)';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(3, -4);
  ctx.lineTo(3, 6);
  ctx.lineTo(0, 8);
  ctx.lineTo(-3, 6);
  ctx.lineTo(-3, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'hsl(25, 80%, 70%)';
  ctx.beginPath();
  ctx.arc(0, 8, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCruiseMissile(ctx: CanvasRenderingContext2D): void {
  // Sleek body
  ctx.fillStyle = 'hsl(200, 20%, 50%)';
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(3, -6);
  ctx.lineTo(3, 8);
  ctx.lineTo(0, 10);
  ctx.lineTo(-3, 8);
  ctx.lineTo(-3, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Small wings
  ctx.fillStyle = 'hsl(200, 30%, 40%)';
  ctx.beginPath();
  ctx.moveTo(-3, 2);
  ctx.lineTo(-8, 6);
  ctx.lineTo(-3, 6);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(3, 2);
  ctx.lineTo(8, 6);
  ctx.lineTo(3, 6);
  ctx.closePath();
  ctx.fill();
  
  // Jet exhaust
  ctx.fillStyle = 'hsl(200, 80%, 70%)';
  ctx.beginPath();
  ctx.arc(0, 12, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawFighterJet(ctx: CanvasRenderingContext2D): void {
  // Delta wing body
  ctx.fillStyle = 'hsl(280, 70%, 50%)';
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(12, 10);
  ctx.lineTo(5, 8);
  ctx.lineTo(0, 12);
  ctx.lineTo(-5, 8);
  ctx.lineTo(-12, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Cockpit
  ctx.fillStyle = 'hsl(200, 100%, 70%)';
  ctx.beginPath();
  ctx.ellipse(0, -4, 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Twin engines
  ctx.fillStyle = 'hsl(280, 50%, 40%)';
  ctx.fillRect(-4, 8, 3, 5);
  ctx.fillRect(1, 8, 3, 5);
  
  // Engine glow
  ctx.fillStyle = 'hsl(30, 100%, 60%)';
  ctx.beginPath();
  ctx.arc(-2.5, 13, 1.5, 0, Math.PI * 2);
  ctx.arc(2.5, 13, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawHelicopter(ctx: CanvasRenderingContext2D, time: number): void {
  // Body
  ctx.fillStyle = 'hsl(160, 70%, 40%)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 7, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Cockpit
  ctx.fillStyle = 'hsl(200, 100%, 75%)';
  ctx.beginPath();
  ctx.ellipse(0, -4, 4, 5, 0, -Math.PI, 0);
  ctx.fill();
  
  // Tail boom
  ctx.fillStyle = 'hsl(160, 60%, 35%)';
  ctx.fillRect(-2, 10, 4, 10);
  
  // Tail rotor
  const tailRotorAngle = (time / 20) % (Math.PI * 2);
  ctx.save();
  ctx.translate(0, 18);
  ctx.rotate(tailRotorAngle);
  ctx.strokeStyle = 'hsl(160, 70%, 50%)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.lineTo(5, 0);
  ctx.stroke();
  ctx.restore();
  
  // Main rotor (spinning)
  const rotorAngle = (time / 15) % (Math.PI * 2);
  ctx.save();
  ctx.translate(0, -2);
  ctx.rotate(rotorAngle);
  ctx.strokeStyle = 'hsl(160, 70%, 55%)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(16, 0);
  ctx.moveTo(0, -16);
  ctx.lineTo(0, 16);
  ctx.stroke();
  ctx.restore();
}

function drawGlideBomb(ctx: CanvasRenderingContext2D, time: number): void {
  // Diamond body
  const glow = Math.sin(time / 150) * 0.3 + 0.7;
  
  ctx.fillStyle = `hsla(340, 100%, 55%, ${glow})`;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(7, 0);
  ctx.lineTo(0, 14);
  ctx.lineTo(-7, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Guidance fins
  ctx.fillStyle = 'hsl(340, 80%, 40%)';
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(5, 16);
  ctx.lineTo(0, 14);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(-5, 16);
  ctx.lineTo(0, 14);
  ctx.closePath();
  ctx.fill();
  
  // Center glow
  ctx.fillStyle = 'hsla(340, 100%, 80%, 0.8)';
  ctx.beginPath();
  ctx.arc(0, 2, 3, 0, Math.PI * 2);
  ctx.fill();
}

const POOL_DISPLAY_MAX = 10;

export function drawBattery(
  ctx: CanvasRenderingContext2D, 
  battery: Battery, 
  isSelected: boolean,
  upgradeLevel: number,
  time: number,
  ammoPool?: { shortRange: number; mediumRange: number; longRange: number }
): void {
  const color = getBatteryColor(battery.type);
  
  // Range indicator (only when selected)
  if (isSelected) {
    const bonusRange = battery.range * 0.15 * upgradeLevel;
    const effectiveRange = battery.range + bonusRange;
    
    ctx.strokeStyle = hslToHsla(color, 0.25);
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(battery.x, battery.y, effectiveRange, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  ctx.save();
  ctx.translate(battery.x, battery.y);
  
  const poolCount = ammoPool && (battery.type === 'shortRange' || battery.type === 'mediumRange' || battery.type === 'longRange') ? ammoPool[battery.type] : (battery.type === 'thaad' || battery.type === 'david' || battery.type === 'arrow2' ? battery.ammo : undefined);
  switch (battery.type) {
    case 'shortRange':
      drawIronDomeBattery(ctx, battery, isSelected, time, poolCount);
      break;
    case 'mediumRange':
      drawPatriotBattery(ctx, battery, isSelected, time, poolCount);
      break;
    case 'longRange':
    case 'thaad':
    case 'david':
    case 'arrow2':
      drawArrowBattery(ctx, battery, isSelected, time, poolCount);
      break;
    case 'laser':
      drawIronBeamBattery(ctx, battery, isSelected, time);
      break;
  }
  
  ctx.restore();
  
  // Selection ring
  if (isSelected) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(battery.x, battery.y, 28, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Reloading indicator (only for legacy path; projectile batteries use global pool, no reload ring)
  if (battery.isReloading) {
    ctx.strokeStyle = 'hsl(185, 100%, 50%)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      battery.x, battery.y, 32,
      -Math.PI / 2,
      -Math.PI / 2 + (Math.PI * 2 * battery.reloadProgress)
    );
    ctx.stroke();
  }
}

function drawIronDomeBattery(ctx: CanvasRenderingContext2D, battery: Battery, isSelected: boolean, time: number, poolCount?: number): void {
  // Base platform
  ctx.fillStyle = 'hsl(220, 20%, 20%)';
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  
  // Launcher tubes (3 angled)
  ctx.fillStyle = 'hsl(185, 80%, 45%)';
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate((i - 1) * 0.4);
    ctx.fillRect(-3, -20, 6, 18);
    ctx.restore();
  }
  
  // Active LED when firing
  const isActive = battery.targetThreatId !== null;
  ctx.fillStyle = isActive ? 'hsl(120, 100%, 50%)' : 'hsl(120, 50%, 25%)';
  ctx.beginPath();
  ctx.arc(0, 8, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Ammo indicator bar (from pool or legacy per-battery)
  const ammoRatio = poolCount !== undefined ? Math.min(1, poolCount / POOL_DISPLAY_MAX) : (battery.maxAmmo ? battery.ammo / battery.maxAmmo : 0);
  const barColor = ammoRatio > 0.3 ? 'hsl(185, 100%, 50%)' : 'hsl(0, 100%, 50%)';
  const shouldFlash = ammoRatio <= 0.3 && ammoRatio > 0 && Math.sin(time / 100) > 0;
  
  if (!shouldFlash) {
    ctx.fillStyle = 'hsl(0, 0%, 15%)';
    ctx.fillRect(-12, 14, 24, 4);
    ctx.fillStyle = barColor;
    ctx.fillRect(-12, 14, 24 * ammoRatio, 4);
  }
}

function drawArrowBattery(ctx: CanvasRenderingContext2D, battery: Battery, isSelected: boolean, time: number, poolCount?: number): void {
  // Angled base platform
  ctx.fillStyle = 'hsl(280, 20%, 20%)';
  ctx.beginPath();
  ctx.moveTo(-20, 10);
  ctx.lineTo(-15, -15);
  ctx.lineTo(15, -15);
  ctx.lineTo(20, 10);
  ctx.closePath();
  ctx.fill();
  
  // Large missile container
  ctx.fillStyle = 'hsl(280, 70%, 50%)';
  ctx.fillRect(-8, -18, 16, 25);
  
  // Missile tips visible
  ctx.fillStyle = 'hsl(0, 0%, 40%)';
  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.lineTo(6, -18);
  ctx.lineTo(-6, -18);
  ctx.closePath();
  ctx.fill();
  
  // Antenna on top
  ctx.strokeStyle = 'hsl(280, 60%, 60%)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.lineTo(0, -32);
  ctx.stroke();
  ctx.fillStyle = 'hsl(280, 100%, 70%)';
  ctx.beginPath();
  ctx.arc(0, -33, 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Ammo indicator (from pool or legacy per-battery)
  const ammoRatio = poolCount !== undefined ? Math.min(1, poolCount / POOL_DISPLAY_MAX) : (battery.maxAmmo ? battery.ammo / battery.maxAmmo : 0);
  ctx.fillStyle = 'hsl(0, 0%, 15%)';
  ctx.fillRect(-10, 14, 20, 4);
  ctx.fillStyle = ammoRatio > 0.3 ? 'hsl(280, 100%, 60%)' : 'hsl(0, 100%, 50%)';
  ctx.fillRect(-10, 14, 20 * ammoRatio, 4);
}

function drawIronBeamBattery(ctx: CanvasRenderingContext2D, battery: Battery, isSelected: boolean, time: number): void {
  // Support tower
  ctx.fillStyle = 'hsl(120, 20%, 25%)';
  ctx.fillRect(-4, -5, 8, 20);
  
  // Parabolic dish
  ctx.fillStyle = 'hsl(120, 60%, 45%)';
  ctx.beginPath();
  ctx.ellipse(0, -10, 18, 10, 0, Math.PI, 0);
  ctx.fill();
  
  // Dish interior
  ctx.fillStyle = 'hsl(120, 40%, 35%)';
  ctx.beginPath();
  ctx.ellipse(0, -8, 14, 7, 0, Math.PI, 0);
  ctx.fill();
  
  // Central emitter
  const isActive = battery.isActive || battery.targetThreatId !== null;
  ctx.fillStyle = isActive ? 'hsl(120, 100%, 60%)' : 'hsl(120, 50%, 35%)';
  ctx.beginPath();
  ctx.arc(0, -8, 5, 0, Math.PI * 2);
  ctx.fill();
  
  // Active glow
  if (isActive) {
    ctx.shadowColor = 'hsl(120, 100%, 50%)';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  
  // Heat meter (right side)
  const heatRatio = battery.heatLevel / getGameConfig().LASER.maxHeatTime;
  ctx.fillStyle = 'hsl(0, 0%, 20%)';
  ctx.fillRect(20, -15, 5, 25);
  
  const heatColor = battery.isOverheated ? 'hsl(0, 100%, 50%)' : `hsl(${30 - heatRatio * 30}, 100%, 50%)`;
  ctx.fillStyle = heatColor;
  ctx.fillRect(20, -15 + 25 * (1 - heatRatio), 5, 25 * heatRatio);
  
  // Overheat warning
  if (battery.isOverheated) {
    ctx.fillStyle = 'hsl(0, 100%, 60%)';
    ctx.font = 'bold 10px Heebo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('מתקרר!', 0, 28);
  }
}

// Patriot battery (medium-range SAM)
function drawPatriotBattery(ctx: CanvasRenderingContext2D, battery: Battery, isSelected: boolean, time: number, poolCount?: number): void {
  // Truck base
  ctx.fillStyle = 'hsl(30, 25%, 22%)';
  ctx.fillRect(-16, -8, 32, 18);
  
  // Wheels
  ctx.fillStyle = 'hsl(0, 0%, 20%)';
  ctx.beginPath();
  ctx.arc(-10, 10, 5, 0, Math.PI * 2);
  ctx.arc(10, 10, 5, 0, Math.PI * 2);
  ctx.fill();
  
  // Launcher box (orange/amber Patriot style)
  ctx.fillStyle = 'hsl(40, 80%, 45%)';
  ctx.fillRect(-12, -18, 24, 12);
  
  // Missile tubes (4)
  ctx.fillStyle = 'hsl(40, 60%, 35%)';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(-9 + i * 6, -12, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Radar/guidance on top
  ctx.fillStyle = 'hsl(40, 100%, 55%)';
  ctx.beginPath();
  ctx.ellipse(0, -20, 6, 3, 0, Math.PI, 0);
  ctx.fill();
  
  const isActive = battery.targetThreatId !== null;
  ctx.fillStyle = isActive ? 'hsl(50, 100%, 60%)' : 'hsl(40, 50%, 30%)';
  ctx.beginPath();
  ctx.arc(0, -20, 2, 0, Math.PI * 2);
  ctx.fill();
  
  const ammoRatio = poolCount !== undefined ? Math.min(1, poolCount / POOL_DISPLAY_MAX) : (battery.maxAmmo ? battery.ammo / battery.maxAmmo : 0);
  ctx.fillStyle = 'hsl(0, 0%, 15%)';
  ctx.fillRect(-10, 14, 20, 4);
  ctx.fillStyle = ammoRatio > 0.3 ? 'hsl(40, 100%, 50%)' : 'hsl(0, 100%, 50%)';
  ctx.fillRect(-10, 14, 20 * ammoRatio, 4);
}

export function drawProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile): void {
  // Fixed arc trail from launch to target
  const sx = projectile.startX ?? projectile.x;
  const sy = projectile.startY ?? projectile.y;
  const dist = Math.hypot(projectile.targetX - sx, projectile.targetY - sy);
  if (dist > 5) {
    const arcHeight = dist * 0.15;
    const midX = (sx + projectile.targetX) / 2;
    const midY = (sy + projectile.targetY) / 2;
    const perpAngle = Math.atan2(projectile.targetY - sy, projectile.targetX - sx) - Math.PI / 2;
    const ctrlX = midX + Math.cos(perpAngle) * arcHeight;
    const ctrlY = midY + Math.sin(perpAngle) * arcHeight;
    ctx.strokeStyle = COLORS.projectileTrail;
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(ctrlX, ctrlY, projectile.targetX, projectile.targetY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Projectile head
  ctx.fillStyle = COLORS.projectile;
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, 5, 0, Math.PI * 2);
  ctx.fill();
  
  // Glow effect
  ctx.shadowColor = COLORS.projectile;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
}

export function drawLaserBeam(ctx: CanvasRenderingContext2D, beam: LaserBeam): void {
  // Outer glow
  ctx.strokeStyle = `hsla(120, 100%, 70%, ${beam.alpha * 0.5})`;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(beam.startX, beam.startY);
  ctx.lineTo(beam.endX, beam.endY);
  ctx.stroke();
  
  // Main beam
  ctx.strokeStyle = `hsla(120, 100%, 50%, ${beam.alpha})`;
  ctx.lineWidth = 5;
  ctx.stroke();
  
  // Core
  ctx.strokeStyle = `hsla(120, 100%, 90%, ${beam.alpha})`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function drawExplosion(ctx: CanvasRenderingContext2D, explosion: Explosion): void {
  // Main explosion circle
  const gradient = ctx.createRadialGradient(
    explosion.x, explosion.y, 0,
    explosion.x, explosion.y, explosion.radius
  );
  gradient.addColorStop(0, `hsla(50, 100%, 90%, ${explosion.alpha})`);
  gradient.addColorStop(0.4, `hsla(40, 100%, 60%, ${explosion.alpha * 0.8})`);
  gradient.addColorStop(0.7, `hsla(25, 100%, 50%, ${explosion.alpha * 0.5})`);
  gradient.addColorStop(1, 'transparent');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Particles
  for (const particle of explosion.particles) {
    if (particle.alpha > 0) {
      ctx.fillStyle = particle.color.replace(')', `, ${particle.alpha})`).replace('hsl', 'hsla');
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawPlacementPreview(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  batteryType: string,
  isValid: boolean
): void {
  const validColor = 'hsla(120, 80%, 50%, 0.5)';
  const invalidColor = 'hsla(0, 80%, 50%, 0.5)';
  const color = isValid ? validColor : invalidColor;
  
  // Preview circle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fill();
  
  // Range preview - match GAME_CONFIG
  let range = getGameConfig().SHORT_RANGE.range;
  if (batteryType === 'mediumRange') range = getGameConfig().MEDIUM_RANGE.range;
  else if (batteryType === 'longRange') range = getGameConfig().LONG_RANGE.range;
  else if (batteryType === 'laser') range = getGameConfig().LASER.range;
  else if (batteryType === 'thaad') range = getGameConfig().THAAD?.range ?? 160;
  else if (batteryType === 'david') range = getGameConfig().DAVID?.range ?? 110;
  else if (batteryType === 'arrow2') range = getGameConfig().ARROW2?.range ?? 120;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Plus icon
  ctx.strokeStyle = isValid ? 'hsl(120, 80%, 70%)' : 'hsl(0, 80%, 70%)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x + 8, y);
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x, y + 8);
  ctx.stroke();
}

// Radar placement preview
export function drawRadarPlacementPreview(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radarType: string,
  isValid: boolean
): void {
  const validColor = 'hsla(50, 80%, 50%, 0.5)';
  const invalidColor = 'hsla(0, 80%, 50%, 0.5)';
  const color = isValid ? validColor : invalidColor;
  
  // Preview circle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fill();
  
  // Range preview – match createRadar ranges; naval = sector to sea (west) only
  let range = 55;
  if (radarType === 'advanced') range = 150;
  else if (radarType === 'longRange') range = 170;
  else if (radarType === 'lband') range = 140;
  else if (radarType === 'naval') range = 340;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 10]);
  ctx.beginPath();
  if (radarType === 'naval') {
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, NAVAL_SEA_ANGLE - NAVAL_SECTOR_HALF, NAVAL_SEA_ANGLE + NAVAL_SECTOR_HALF);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

export function applyScreenShake(ctx: CanvasRenderingContext2D, shake: number): void {
  if (shake > 0) {
    const offsetX = (Math.random() - 0.5) * shake * 2;
    const offsetY = (Math.random() - 0.5) * shake * 2;
    ctx.translate(offsetX, offsetY);
  }
}

// Draw radar with detailed design
export function drawRadar(ctx: CanvasRenderingContext2D, radar: Radar, time: number): void {
  const colors: Record<string, { main: string; dark: string; glow: string }> = {
    basic: { main: 'hsl(55, 100%, 50%)', dark: 'hsl(55, 80%, 35%)', glow: 'hsl(55, 100%, 70%)' },
    advanced: { main: 'hsl(30, 100%, 50%)', dark: 'hsl(30, 80%, 35%)', glow: 'hsl(30, 100%, 70%)' },
    longRange: { main: 'hsl(0, 80%, 55%)', dark: 'hsl(0, 60%, 35%)', glow: 'hsl(0, 100%, 70%)' },
    lband: { main: 'hsl(200, 80%, 55%)', dark: 'hsl(200, 60%, 35%)', glow: 'hsl(200, 100%, 70%)' },
    naval: { main: 'hsl(190, 85%, 50%)', dark: 'hsl(190, 65%, 35%)', glow: 'hsl(190, 100%, 70%)' },
  };
  
  const colorSet = colors[radar.type] ?? colors.basic;
  const isNaval = radar.type === 'naval';
  const sweepAngle = (time / 800) % (Math.PI * 2);
  const sweepCount = radar.type === 'basic' ? 1 : radar.type === 'advanced' ? 2 : radar.type === 'lband' ? 2 : radar.type === 'naval' ? 2 : 3;
  const navalStart = NAVAL_SEA_ANGLE - NAVAL_SECTOR_HALF;
  const navalEnd = NAVAL_SEA_ANGLE + NAVAL_SECTOR_HALF;
  
  // Range: full circle or naval sector only
  ctx.strokeStyle = hslToHsla(colorSet.main, 0.15);
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  if (isNaval) {
    ctx.moveTo(radar.x, radar.y);
    ctx.arc(radar.x, radar.y, radar.range, navalStart, navalEnd);
    ctx.closePath();
  } else {
    ctx.arc(radar.x, radar.y, radar.range, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Sweep effects (for naval, only within sector)
  for (let i = 0; i < sweepCount; i++) {
    const angle = sweepAngle + (i * Math.PI * 2 / sweepCount);
    if (isNaval) {
      const a0 = Math.max(navalStart, angle);
      const a1 = Math.min(navalEnd, angle + 0.4);
      if (a0 < a1) {
        ctx.fillStyle = hslToHsla(colorSet.glow, 0.15);
        ctx.beginPath();
        ctx.moveTo(radar.x, radar.y);
        ctx.arc(radar.x, radar.y, radar.range * 0.8, a0, a1);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.fillStyle = hslToHsla(colorSet.glow, 0.15);
      ctx.beginPath();
      ctx.moveTo(radar.x, radar.y);
      ctx.arc(radar.x, radar.y, radar.range * 0.8, angle, angle + 0.4);
      ctx.closePath();
      ctx.fill();
    }
  }
  
  ctx.save();
  ctx.translate(radar.x, radar.y);
  
  // Base platform
  ctx.fillStyle = 'hsl(220, 20%, 18%)';
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  
  if (radar.type === 'basic') {
    // Basic - small dish
    ctx.fillStyle = colorSet.dark;
    ctx.beginPath();
    ctx.ellipse(0, -4, 10, 6, 0, Math.PI, 0);
    ctx.fill();
    
    ctx.fillStyle = colorSet.main;
    ctx.beginPath();
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Support pole
    ctx.fillStyle = 'hsl(220, 20%, 25%)';
    ctx.fillRect(-2, -2, 4, 12);
  } else if (radar.type === 'advanced') {
    // Advanced - larger dish with secondary antennas
    ctx.fillStyle = colorSet.dark;
    ctx.beginPath();
    ctx.ellipse(0, -5, 14, 8, 0, Math.PI, 0);
    ctx.fill();
    
    ctx.fillStyle = colorSet.main;
    ctx.beginPath();
    ctx.arc(0, -3, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Secondary antennas
    ctx.strokeStyle = colorSet.main;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-14, -8);
    ctx.moveTo(10, 0);
    ctx.lineTo(14, -8);
    ctx.stroke();
    
    ctx.fillStyle = colorSet.glow;
    ctx.beginPath();
    ctx.arc(-14, -8, 2, 0, Math.PI * 2);
    ctx.arc(14, -8, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Long range - AESA array
    ctx.fillStyle = colorSet.dark;
    ctx.fillRect(-12, -12, 24, 16);
    
    // Array elements
    ctx.fillStyle = colorSet.main;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        ctx.beginPath();
        ctx.arc(-9 + col * 6, -8 + row * 5, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Halo effect
    ctx.strokeStyle = hslToHsla(colorSet.glow, 0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -4, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Rotating indicator
  ctx.save();
  ctx.rotate(sweepAngle * 2);
  ctx.strokeStyle = colorSet.glow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -12);
  ctx.stroke();
  ctx.restore();
  
  ctx.restore();
  
  // Detected threats count
  if (radar.detectedThreats.length > 0) {
    ctx.fillStyle = 'hsla(0, 0%, 0%, 0.6)';
    const text = `${radar.detectedThreats.length} מטרות`;
    const textWidth = ctx.measureText(text).width + 8;
    ctx.fillRect(radar.x - textWidth / 2, radar.y + 18, textWidth, 14);
    
    ctx.fillStyle = colorSet.main;
    ctx.font = 'bold 10px Heebo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, radar.x, radar.y + 29);
  }
}

export function initializeCities(canvasWidth: number, canvasHeight: number): City[] {
  return CITY_POSITIONS.map((pos, index) => ({
    id: pos.id,
    name: pos.name,
    x: pos.x * canvasWidth,
    y: pos.y * canvasHeight,
    isTargeted: false,
    pulsePhase: index * 0.5,
  }));
}
