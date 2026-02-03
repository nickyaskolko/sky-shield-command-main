// Sky Shield - מגן השמיים
// Main game page - Using Leaflet with real OSM tiles

import { useEffect } from 'react';
import { GameWithLeaflet } from '@/components/game/GameWithLeaflet';
import { analytics } from '@/lib/analytics';

const Index = () => {
  useEffect(() => {
    analytics.pageView();
  }, []);

  return (
    <div id="main-content" role="main" className="min-h-screen bg-game-bg overflow-hidden" dir="rtl" aria-label="תוכן ראשי – משחק מגן השמיים">
      <GameWithLeaflet />
    </div>
  );
};

export default Index;
