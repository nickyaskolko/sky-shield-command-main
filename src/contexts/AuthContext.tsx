// Auth context – Supabase auth state and actions

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { analytics } from '@/lib/analytics';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Set when user was signed out because profile.banned – show "חשבונך חסום" */
  blockedMessage: string | null;
  signIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<void>;
  signInWithOtp: (email: string) => Promise<{ error: { message: string } | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch(() => {
        setSession(null);
        setUser(null);
      })
      .finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // After session is set, check if user is banned (profile.banned) – if so, sign out and show message
  useEffect(() => {
    if (loading || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        // select('*') so we don't get 400 if 'banned' column is missing (migration not run yet)
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (cancelled) return;
        if ((data as { banned?: boolean } | null)?.banned) {
          analytics.authBlocked(user.id);
          setBlockedMessage('חשבונך חסום מגישה לאתר. פנה למנהל.');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        }
      } catch {
        // Ignore profile fetch errors (e.g. RLS, network); user can continue
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user?.id]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? { message: error.message } : null };
    } catch (e) {
      return { error: { message: e instanceof Error ? e.message : 'שגיאה בהתחברות' } };
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName?.trim() || undefined } },
      });
      return { error: error ? { message: error.message } : null };
    } catch (e) {
      return { error: { message: e instanceof Error ? e.message : 'שגיאה בהרשמה' } };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      setSession(null);
      setUser(null);
    }
  };

  const signInWithOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      return { error: error ? { message: error.message } : null };
    } catch (e) {
      return { error: { message: e instanceof Error ? e.message : 'שגיאה בשליחת קישור' } };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        blockedMessage,
        signIn,
        signUp,
        signOut,
        signInWithOtp,
      }}
    >
      {blockedMessage ? (
        <div className="min-h-screen flex items-center justify-center bg-game-bg text-game-text p-4" dir="rtl">
          <div className="text-center max-w-md">
            <p className="text-xl font-semibold text-red-400 mb-2">{blockedMessage}</p>
            <p className="text-game-text-dim text-sm">התנתקת מהמערכת. ניתן לנסות להתחבר שוב רק לאחר הסרת החסימה.</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
