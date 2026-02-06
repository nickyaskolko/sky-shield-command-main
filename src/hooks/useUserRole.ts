// Hook to get admin and donor tier from Supabase (for design theme options)

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export type DonorTier = 1 | 2 | 3;

export interface UserRole {
  isAdmin: boolean;
  donorTier: DonorTier | null;
  loading: boolean;
}

/** Returns max design theme option available: admin=3, donor 3=3, donor 2=2, donor 1=1, else 0 (none) */
export function maxDesignThemeOption(role: UserRole): 0 | 1 | 2 | 3 {
  if (role.isAdmin) return 3;
  if (role.donorTier === 3) return 3;
  if (role.donorTier === 2) return 2;
  if (role.donorTier === 1) return 1;
  return 0;
}

export function useUserRole(): UserRole {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [donorTier, setDonorTier] = useState<DonorTier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsAdmin(false);
      setDonorTier(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [adminRes, profileRes] = await Promise.all([
          supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle(),
          supabase.from('profiles').select('donor_tier').eq('id', user.id).maybeSingle(),
        ]);
        if (cancelled) return;
        setIsAdmin(!!adminRes.data);
        const tier = (profileRes.data as { donor_tier?: number } | null)?.donor_tier;
        setDonorTier(tier >= 1 && tier <= 3 ? (tier as DonorTier) : null);
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setDonorTier(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { isAdmin, donorTier, loading };
}
