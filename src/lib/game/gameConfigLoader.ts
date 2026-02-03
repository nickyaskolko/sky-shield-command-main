// Game config loader – טעינת הגדרות מ-Supabase ומזג עם ברירת המחדל

import { supabase } from '@/lib/supabase';
import { GAME_CONFIG } from '@/lib/constants';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

let overridesCache: Record<string, JsonValue> = {};

function deepMerge<T extends object>(base: T, overrides: Record<string, JsonValue>): T {
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(overrides)) {
    if (!Object.prototype.hasOwnProperty.call(result, key)) {
      (result as Record<string, JsonValue>)[key] = overrides[key];
      continue;
    }
    const baseVal = (base as Record<string, unknown>)[key];
    const overrideVal = overrides[key];
    if (
      overrideVal !== null &&
      typeof overrideVal === 'object' &&
      !Array.isArray(overrideVal) &&
      baseVal !== null &&
      typeof baseVal === 'object' &&
      !Array.isArray(baseVal)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        baseVal as Record<string, JsonValue>,
        overrideVal as Record<string, JsonValue>
      );
    } else {
      (result as Record<string, JsonValue>)[key] = overrideVal;
    }
  }
  return result as T;
}

/** Load overrides from Supabase game_config and cache them. Call once at app init. */
export async function loadGameConfigOverrides(): Promise<void> {
  try {
    const { data, error } = await supabase.from('game_config').select('key, value');
    if (error || !data) {
      overridesCache = {};
      return;
    }
    const next: Record<string, JsonValue> = {};
    for (const row of data) {
      next[row.key] = row.value as JsonValue;
    }
    overridesCache = next;
  } catch {
    overridesCache = {};
  }
}

/** Returns GAME_CONFIG merged with DB overrides. Use this instead of GAME_CONFIG where overrides should apply. */
export function getGameConfig(): typeof GAME_CONFIG {
  return deepMerge(GAME_CONFIG as unknown as Record<string, JsonValue>, overridesCache) as typeof GAME_CONFIG;
}
