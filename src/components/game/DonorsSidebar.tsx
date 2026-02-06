// Donors Sidebar – טבלת תורמים בצד ימין של מסך הבית

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n/he';

interface DonorProfile {
  id: string;
  display_name: string | null;
  donor_tier: number | null;
}

export function DonorsSidebar() {
  const [donors, setDonors] = useState<DonorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, donor_tier')
          .not('donor_tier', 'is', null)
          .order('donor_tier', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) throw error;
        setDonors((data as DonorProfile[]) ?? []);
      } catch (err) {
        console.error('Error loading donors:', err);
        setDonors([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const byTier = {
    3: donors.filter((d) => d.donor_tier === 3),
    2: donors.filter((d) => d.donor_tier === 2),
    1: donors.filter((d) => d.donor_tier === 1),
  };

  return (
    <aside
      className="w-44 sm:w-52 shrink-0 flex flex-col border-r border-game-accent/20 bg-game-panel/80 backdrop-blur-sm overflow-hidden"
      dir="rtl"
      aria-label="רשימת תורמים"
    >
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-game-accent/20 bg-game-panel/90">
        <Trophy className="h-4 w-4 text-amber-400" />
        <span className="text-sm font-bold text-game-accent">תורמים</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto py-2 px-2 space-y-3">
        {loading ? (
          <p className="text-game-text-dim text-xs text-center py-4">טוען...</p>
        ) : donors.length === 0 ? (
          <p className="text-game-text-dim text-xs text-center py-4">אין תורמים עדיין</p>
        ) : (
          <>
            {byTier[3].length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-purple-300 mb-1.5 flex items-center gap-1">
                  <span>💎</span> {t('donorTier3')}
                </h3>
                <ul className="space-y-1">
                  {byTier[3].map((d) => (
                    <li
                      key={d.id}
                      className="text-xs text-purple-200/90 truncate px-2 py-0.5 rounded bg-purple-500/10"
                      title={d.display_name || d.id}
                    >
                      {d.display_name || 'אנונימי'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {byTier[2].length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-yellow-300 mb-1.5 flex items-center gap-1">
                  <span>🥇</span> {t('donorTier2')}
                </h3>
                <ul className="space-y-1">
                  {byTier[2].map((d) => (
                    <li
                      key={d.id}
                      className="text-xs text-yellow-200/90 truncate px-2 py-0.5 rounded bg-yellow-500/10"
                      title={d.display_name || d.id}
                    >
                      {d.display_name || 'אנונימי'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {byTier[1].length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1">
                  <span>🥉</span> {t('donorTier1')}
                </h3>
                <ul className="space-y-1">
                  {byTier[1].map((d) => (
                    <li
                      key={d.id}
                      className="text-xs text-amber-200/90 truncate px-2 py-0.5 rounded bg-amber-500/10"
                      title={d.display_name || d.id}
                    >
                      {d.display_name || 'אנונימי'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
