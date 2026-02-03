// Israel map - גוש ישראל למשחק Leaflet
// Shared bounds and city coordinates so game logic matches map display

import type { City } from './entities';
import { getGameConfig } from './gameConfigLoader';

/** Map bounds – Israel only (tight fit) Metula to Eilat */
export const ISRAEL_MAP_BOUNDS = {
  south: 29.45,
  north: 33.35,
  west: 34.25,
  east: 35.95,
} as const;

/** Fixed aspect ratio (width/height) so the whole country fits – ממטולה ועד אילת */
export const ISRAEL_ASPECT_RATIO = (ISRAEL_MAP_BOUNDS.east - ISRAEL_MAP_BOUNDS.west) / (ISRAEL_MAP_BOUNDS.north - ISRAEL_MAP_BOUNDS.south);

export const CITIES_LATLNG = [
  { id: 'haifa', name: 'חיפה', lat: 32.794, lng: 34.9896 },
  { id: 'nahariya', name: 'נהריה', lat: 33.0081, lng: 35.0981 },
  { id: 'acre', name: 'עכו', lat: 32.9262, lng: 35.0714 },
  { id: 'tiberias', name: 'טבריה', lat: 32.7959, lng: 35.531 },
  { id: 'netanya', name: 'נתניה', lat: 32.332, lng: 34.855 },
  { id: 'hadera', name: 'חדרה', lat: 32.434, lng: 34.9195 },
  { id: 'telaviv', name: 'תל אביב', lat: 32.0853, lng: 34.7818 },
  { id: 'ashdod', name: 'אשדוד', lat: 31.7928, lng: 34.6492 },
  { id: 'ashkelon', name: 'אשקלון', lat: 31.6688, lng: 34.5742 },
  { id: 'jerusalem', name: 'ירושלים', lat: 31.7683, lng: 35.2137 },
  { id: 'beersheva', name: 'באר שבע', lat: 31.2518, lng: 34.7913 },
  { id: 'dimona', name: 'דימונה', lat: 31.0694, lng: 35.0322 },
  { id: 'eilat', name: 'אילת', lat: 29.5577, lng: 34.9519 },
] as const;

/**
 * Convert lat/lng to normalized game coordinates (0..CANVAS_WIDTH, 0..CANVAS_HEIGHT).
 * Use this so threats move towards the same points as city markers on the Leaflet map.
 */
export function latLngToNormalized(
  lat: number,
  lng: number,
  canvasWidth: number = getGameConfig().CANVAS_WIDTH,
  canvasHeight: number = getGameConfig().CANVAS_HEIGHT
): { x: number; y: number } {
  const { north, south, east, west } = ISRAEL_MAP_BOUNDS;
  const x = ((lng - west) / (east - west)) * canvasWidth;
  const y = ((north - lat) / (north - south)) * canvasHeight;
  return { x, y };
}

/**
 * Convert normalized canvas coordinates to lat/lng (inverse of latLngToNormalized).
 */
export function normalizedToLatLng(
  x: number,
  y: number,
  canvasWidth: number = getGameConfig().CANVAS_WIDTH,
  canvasHeight: number = getGameConfig().CANVAS_HEIGHT
): { lat: number; lng: number } {
  const { north, south, east, west } = ISRAEL_MAP_BOUNDS;
  const lng = west + (x / canvasWidth) * (east - west);
  const lat = north - (y / canvasHeight) * (north - south);
  return { lat, lng };
}

/** Point-in-polygon (ray casting). Polygon is array of [lat, lng] (closed). */
export function pointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    if (((latI > lat) !== (latJ > lat)) &&
        (lng < (lngJ - lngI) * (lat - latI) / (latJ - latI) + lngI)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Check if a point in normalized canvas space is inside Israel (border polygon).
 * Use for restricting placement of radars and batteries to Israeli territory.
 */
export function pointInIsraelPolygon(
  normalizedX: number,
  normalizedY: number,
  canvasWidth: number = getGameConfig().CANVAS_WIDTH,
  canvasHeight: number = getGameConfig().CANVAS_HEIGHT
): boolean {
  const { lat, lng } = normalizedToLatLng(normalizedX, normalizedY, canvasWidth, canvasHeight);
  return pointInPolygon(lat, lng, ISRAEL_BORDER_POLYGON);
}

/**
 * Initialize cities in normalized game space matching the Leaflet map.
 * Use when playing with GameWithLeaflet so threats fly towards the visible city positions.
 */
export function getInitialCitiesForMap(
  canvasWidth: number = getGameConfig().CANVAS_WIDTH,
  canvasHeight: number = getGameConfig().CANVAS_HEIGHT
): City[] {
  return CITIES_LATLNG.map((pos, index) => {
    const { x, y } = latLngToNormalized(pos.lat, pos.lng, canvasWidth, canvasHeight);
    return {
      id: pos.id,
      name: pos.name,
      x,
      y,
      isTargeted: false,
      pulsePhase: index * 0.5,
    };
  });
}

/** Israel border polygon [lat, lng] – real border: Lebanon, Syria (Golan), coast, Gaza, Eilat, Jordan (WGS84, closed) */
export const ISRAEL_BORDER_POLYGON: [number, number][] = [
  // Israel–Lebanon (Blue Line): Rosh Hanikra → Metula
  [33.086, 35.113],   // Rosh Hanikra (coast)
  [33.100, 35.220],
  [33.150, 35.400],
  [33.240, 35.530],
  [33.277, 35.565],   // Metula
  // Israel–Syria (Golan): Metula → Hermon → eastern border (black line – well east of Kinneret)
  [33.295, 35.88],    // Hermon – eastern limit
  [33.14, 35.92],
  [33.02, 35.90],
  [32.88, 35.86],
  [32.77, 35.82],     // south Golan – east
  // East Kinneret: border east of lake (Golan side – black line)
  [32.815, 35.72],
  [32.798, 35.70],
  [32.785, 35.68],
  [32.778, 35.65],
  [32.772, 35.62],    // south Kinneret (Degania)
  [32.665, 35.552],   // Menahemia
  [32.498, 35.552],   // Beit She'an
  // Jordan Valley / Green Line
  [32.198, 35.538],
  [31.758, 35.518],
  [31.518, 35.488],
  [31.228, 35.418],
  [30.618, 35.218],
  [29.948, 34.972],
  [29.558, 34.948],   // Eilat
  // Sinai/Egypt border
  [29.768, 34.872],
  [31.058, 34.368],
  [31.498, 34.268],   // Gaza
  // Mediterranean coast
  [31.668, 34.508],
  [31.792, 34.649],
  [32.085, 34.782],
  [32.332, 34.855],
  [32.434, 34.919],
  // Haifa – Acre – Nahariya coast (refined)
  [32.794, 34.990],   // Haifa
  [32.855, 35.035],   // Kiryat Yam / coast north of Haifa
  [32.926, 35.071],   // Acre
  [32.965, 35.082],   // coast north of Acre
  [33.008, 35.098],   // Nahariya → closes to Rosh Hanikra
];

/** Enemy territory polygons [lat, lng] – simple rectangles outside Israel for "fell in enemy territory" */
const ENEMY_TERRITORY_POLYGONS: [number, number][][] = [
  // Gaza – west of Israel (lng < 34.25)
  [[31.0, 34.0], [31.6, 34.0], [31.6, 34.25], [31.0, 34.25], [31.0, 34.0]],
  // South Lebanon – north of Israel (lat > 33.35)
  [[33.35, 35.0], [34.5, 35.0], [34.5, 36.0], [33.35, 36.0], [33.35, 35.0]],
  // Syria (SW) – east of Israel (lng > 35.95)
  [[32.8, 35.95], [33.5, 35.95], [33.5, 36.5], [32.8, 36.5], [32.8, 35.95]],
  // Yemen – south of Israel (lat < 29.45)
  [[28.5, 34.5], [29.45, 34.5], [29.45, 36.0], [28.5, 36.0], [28.5, 34.5]],
  // Iran / Iraq – far east (lng > 36.5)
  [[31.0, 36.5], [34.0, 36.5], [34.0, 39.0], [31.0, 39.0], [31.0, 36.5]],
];

/**
 * Returns true if the normalized point (x,y) is inside enemy territory (Gaza, Lebanon, Syria, etc.).
 * Used to remove threats that "fell in enemy territory" – they don't reach the city or damage morale.
 */
export function pointInEnemyTerritory(
  normalizedX: number,
  normalizedY: number,
  canvasWidth: number = getGameConfig().CANVAS_WIDTH,
  canvasHeight: number = getGameConfig().CANVAS_HEIGHT
): boolean {
  const { lat, lng } = normalizedToLatLng(normalizedX, normalizedY, canvasWidth, canvasHeight);
  return ENEMY_TERRITORY_POLYGONS.some(poly => pointInPolygon(lat, lng, poly));
}
