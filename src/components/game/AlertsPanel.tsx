// Alerts panel – right side: alerts by area; type shown when radar detects (isDetected); recent hits "פגע ביעד"

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Threat, getThreatName } from '@/lib/game/entities';
import { cn } from '@/lib/utils';

const RECENT_HIT_DISPLAY_MS = 5000;

interface AlertsPanelProps {
  className?: string;
}

export function AlertsPanel({ className }: AlertsPanelProps) {
  const threats = useGameStore(state => state.threats);
  const cities = useGameStore(state => state.cities);
  const cityHitLog = useGameStore(state => state.cityHitLog);
  const enemyTerritoryFallLog = useGameStore(state => state.enemyTerritoryFallLog);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const recentHits = cityHitLog.filter(e => now - e.timestamp < RECENT_HIT_DISPLAY_MS);
  const recentEnemyTerritoryFalls = enemyTerritoryFallLog.filter(e => now - e.timestamp < RECENT_HIT_DISPLAY_MS);
  const byCity = new Map<string | null, Threat[]>();
  for (const t of threats) {
    const key = t.targetCityId ?? null;
    if (!byCity.has(key)) byCity.set(key, []);
    byCity.get(key)!.push(t);
  }

  return (
    <div
      className={cn(
        'absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 w-32 sm:w-56 max-h-[40vh] sm:max-h-[50vh] flex flex-col rounded-md sm:rounded-lg border border-game-accent/30 bg-game-panel/90 backdrop-blur-sm text-[10px] sm:text-sm z-10 pointer-events-auto',
        className
      )}
      dir="rtl"
    >
      <div className="shrink-0 px-2 sm:px-3 pt-2 sm:pt-3 pb-1 border-b border-game-accent/20 bg-game-panel/95 rounded-t-md sm:rounded-t-lg">
        <span className="text-game-accent font-medium">התראות</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 sm:px-3 py-1.5 sm:py-2">
        {threats.length === 0 && recentHits.length === 0 && recentEnemyTerritoryFalls.length === 0 && (
          <p className="text-game-text-dim text-xs mb-2">אין מטרות באוויר</p>
        )}
        {recentEnemyTerritoryFalls.length > 0 && (
          <div className="mb-3 pb-2 border-b border-amber-500/40">
            <span className="text-amber-300/90 font-medium block mb-1">נפל בשטח אויב</span>
            <ul className="space-y-0.5 text-xs">
              {recentEnemyTerritoryFalls.map((e, i) => (
                <li key={`${e.threatId}-${e.timestamp}-${i}`} className="flex items-center gap-1 text-amber-200/90">
                  <span>{getThreatName(e.threatType)}</span>
                  <span className="text-amber-400 font-semibold">– נפל בשטח אויב</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {recentHits.length > 0 && (
          <div className="mb-3 pb-2 border-b border-red-500/40">
            <span className="text-red-400/90 font-medium block mb-1">פגיעות אחרונות</span>
            <ul className="space-y-0.5 text-xs">
              {recentHits.map((e, i) => (
                <li key={`${e.threatId}-${e.timestamp}-${i}`} className="flex items-center gap-1 text-red-300/90">
                  <span>{getThreatName(e.threatType)}</span>
                  <span className="text-red-400 font-semibold">– פגע ביעד: {e.cityName}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ul className="space-y-3">
          {Array.from(byCity.entries()).map(([cityId, list]) => {
            const city = cityId ? cities.find(c => c.id === cityId) : null;
            const areaName = city ? city.name : 'לא ידוע';
            return (
              <li key={cityId ?? 'unknown'} className="border-b border-game-accent/20 pb-2 last:border-0">
                <span className="text-amber-300/90 font-medium block mb-1">אזור: {areaName}</span>
                <ul className="space-y-0.5 text-xs">
                  {list.map(t => (
                    <li key={t.id} className="flex flex-col gap-0.5">
                      <span className={t.isDetected ? 'text-game-text' : 'text-game-text-dim'}>
                        {t.isDetected ? getThreatName(t.type) : '?'}
                      </span>
                      <span className="text-[10px] text-game-text-dim/80">
                        מקור משוער: {t.originName ?? 'לא וודאי'}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
