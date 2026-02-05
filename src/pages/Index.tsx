// Sky Shield - מגן השמיים
// Main game page - Using Leaflet with real OSM tiles

import { useEffect } from 'react';
import { GameWithLeaflet } from '@/components/game/GameWithLeaflet';
import { analytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

const Index = () => {
  useEffect(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    supabase.auth.getUser().then(({ data: { user } }) => {
      analytics.pageView({ path, is_logged_in: !!user?.id });
    }).catch(() => {
      analytics.pageView({ path, is_logged_in: false });
    });
  }, []);

  return (
    <div id="main-content" role="main" className="h-full min-h-[100dvh] min-h-[100vh] bg-game-bg overflow-hidden flex flex-col" dir="rtl" aria-label="תוכן ראשי – משחק מגן השמיים">
      <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
        <GameWithLeaflet />
      </div>
    </div>
  );
};

export default Index;
