// Threat spawn locations - נקודות שיגור מטרות
// All coordinates are OUTSIDE Israel bounds (west 34.25, east 35.95, south 29.45, north 33.35)
// so threats always appear from the correct direction (Gaza from SW, Lebanon from N, etc.)

export type OriginKey = 'gaza' | 'lebanon' | 'syria' | 'iran' | 'yemen' | 'iraq' | 'sea';

export interface SpawnLocation {
  name: string;
  key: OriginKey;
  lat: number;
  lng: number;
  direction: 'north' | 'northeast' | 'east' | 'southeast' | 'south' | 'southwest' | 'west' | 'northwest';
}

export const THREAT_SPAWN_LOCATIONS: SpawnLocation[] = [
  // Lebanon – multiple points north of Israel (lat > 33.35): Tyre, Sidon, Beirut area, further north
  { name: 'לבנון', key: 'lebanon', lat: 33.95, lng: 35.2, direction: 'northwest' },
  { name: 'לבנון', key: 'lebanon', lat: 34.0, lng: 35.6, direction: 'north' },
  { name: 'לבנון', key: 'lebanon', lat: 34.15, lng: 35.85, direction: 'north' },
  { name: 'לבנון', key: 'lebanon', lat: 34.4, lng: 35.9, direction: 'north' },
  // Syria – northeast (lng > 35.95, lat > 33.35)
  { name: 'סוריה', key: 'syria', lat: 33.5, lng: 36.0, direction: 'northeast' },
  { name: 'סוריה', key: 'syria', lat: 33.6, lng: 36.3, direction: 'northeast' },
  { name: 'סוריה', key: 'syria', lat: 33.75, lng: 36.5, direction: 'northeast' },
  // Gaza – west/southwest of Israel (lng < 34.25)
  { name: 'עזה', key: 'gaza', lat: 31.4, lng: 34.1, direction: 'southwest' },
  { name: 'עזה', key: 'gaza', lat: 31.5, lng: 34.0, direction: 'southwest' },
  { name: 'עזה', key: 'gaza', lat: 31.55, lng: 34.15, direction: 'southwest' },
  // Mediterranean – west of Israel (lng < 34.25)
  { name: 'ים תיכון', key: 'sea', lat: 32.5, lng: 34.0, direction: 'west' },
  // Jordan – east of Israel (lng > 35.95)
  { name: 'ירדן', key: 'syria', lat: 32.0, lng: 36.5, direction: 'east' },
  // Iraq – northeast (lng > 35.95, lat north of border)
  { name: 'עיראק', key: 'iraq', lat: 33.5, lng: 37.0, direction: 'northeast' },
  // Yemen – south of Israel (lat < 29.45)
  { name: 'תימן', key: 'yemen', lat: 29.0, lng: 35.5, direction: 'south' },
  // Iran – east of Israel (lng > 35.95)
  { name: 'איראן', key: 'iran', lat: 32.5, lng: 38.0, direction: 'east' },
];

const ORIGINS_NEAR: OriginKey[] = ['gaza', 'lebanon', 'syria'];
const ORIGINS_FAR: OriginKey[] = ['iran', 'yemen', 'iraq'];
const LAND_LOCATIONS = THREAT_SPAWN_LOCATIONS.filter(loc => loc.key !== 'sea');

export function getRandomSpawnLocation(): SpawnLocation {
  return THREAT_SPAWN_LOCATIONS[
    Math.floor(Math.random() * THREAT_SPAWN_LOCATIONS.length)
  ];
}

export function getRandomSpawnLocationForOrigin(originKey: OriginKey): SpawnLocation {
  const list = THREAT_SPAWN_LOCATIONS.filter(loc => loc.key === originKey);
  if (list.length === 0) return getRandomSpawnLocation();
  return list[Math.floor(Math.random() * list.length)];
}

/** Return first spawn location for a given origin key (for deterministic lookup). */
export function getSpawnLocationByKey(originKey: OriginKey): SpawnLocation | undefined {
  return THREAT_SPAWN_LOCATIONS.find(loc => loc.key === originKey);
}

/** Land only – rocket, cruise, ballistic never from sea. */
export function getRandomSpawnLocationForThreatType(threatType: 'rocket' | 'cruise' | 'ballistic'): SpawnLocation {
  const land = LAND_LOCATIONS;
  if (land.length === 0) return getRandomSpawnLocation();
  if (threatType === 'ballistic') {
    const far = land.filter(loc => ORIGINS_FAR.includes(loc.key));
    const pool = far.length > 0 ? far : land;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const near = land.filter(loc => ORIGINS_NEAR.includes(loc.key));
  const pool = near.length > 0 ? near : land;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Sea only – drones, fighters, helicopters (כטב"מים, מטוסים, מסוקים) come from sea. */
export function getSpawnLocationFromSea(): SpawnLocation {
  const sea = THREAT_SPAWN_LOCATIONS.find(loc => loc.key === 'sea');
  return sea ?? THREAT_SPAWN_LOCATIONS[0];
}

export function getSpawnLocationByDirection(
  direction: SpawnLocation['direction']
): SpawnLocation | undefined {
  return THREAT_SPAWN_LOCATIONS.find(loc => loc.direction === direction);
}
