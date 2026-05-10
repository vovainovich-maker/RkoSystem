import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Record<string, unknown> | null;
  role: string | null;
  isAdmin: boolean;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    role: null,
    isAdmin: false,
    loading: true,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);
    const role = roles?.[0]?.role || 'user';
    const isAdmin = role === 'admin' || role === 'super_admin';
    setState((s) => ({ ...s, profile, role, isAdmin }));
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((s) => ({ ...s, user: session?.user ?? null, session, loading: false }));
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setState((s) => ({ ...s, profile: null, role: null, isAdmin: false }));
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((s) => ({ ...s, user: session?.user ?? null, session, loading: false }));
      if (session?.user) fetchProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { ...state, signOut, refetchProfile: () => state.user && fetchProfile(state.user.id) };
}