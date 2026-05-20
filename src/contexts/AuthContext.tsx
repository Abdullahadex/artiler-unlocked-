'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  termsAccepted: boolean;
  isWaitlisted: boolean;
  signUp: (email: string, password: string, displayName?: string, role?: 'collector' | 'designer', collectionInterest?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileRole: (role: 'collector' | 'designer') => Promise<{ error: Error | null }>;
  requestAuthorization: (data: { proof_of_archive_url?: string; archive_portfolio?: string; handshake_code: string }) => Promise<{ error: Error | null }>;
  acceptTerms: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const supabase = getSupabaseClient();
  const configured = supabase !== null;

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (data) {
      setProfile(data);
      // Synchronize LocalStorage as a fast-path cache
      if (data.has_accepted_terms) {
        setTermsAccepted(true);
        localStorage.setItem(`atelier_terms_${userId}`, 'true');
      }
    } else {
      setProfile(null);
    }
  }, [supabase]);

  useEffect(() => {
    // If Supabase is not configured, just set loading to false and return
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    // Establish auth state listener before checking current session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch to avoid potential state update deadlocks
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // Validate existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fast-path: Hydrate terms state from localStorage before profile fetch
        const local = localStorage.getItem(`atelier_terms_${session.user.id}`) === 'true';
        if (local) setTermsAccepted(true);
        
        await fetchProfile(session.user.id);
      }
      
      // DEFER_HYDRATION: Release the lock only after state has fully propagated
      setTimeout(() => setLoading(false), 150);
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, displayName?: string, role: 'collector' | 'designer' = 'collector', collectionInterest?: string) => {
    if (!supabase) {
      return { error: new Error('Authentication not configured') };
    }
    
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split('@')[0],
          role: role,
          collection_interest: collectionInterest,
        },
      },
    });
    
    return { error: error as Error | null };
  }, [supabase]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error('Authentication not configured') };
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    
    await supabase.auth.signOut();
    setProfile(null);
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (!supabase || !user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!error && data) {
      setProfile(data as Profile);
    }
  }, [supabase, user]);

  const requestAuthorization = useCallback(async (data: { proof_of_archive_url?: string; archive_portfolio?: string; handshake_code: string }) => {
    if (!supabase || !user) return { error: new Error('Authentication required') };
    
    const { error } = await supabase
      .from('profiles')
      .update({
        seller_status: 'PENDING',
        archive_portfolio: data.archive_portfolio,
        proof_of_archive_url: data.proof_of_archive_url,
        handshake_code: data.handshake_code,
      })
      .eq('id', user.id);
    
    if (!error) {
      // Refresh profile asynchronously; don't block the UI
      refreshProfile().catch(err => console.error('Profile refresh failed:', err));
    }
    return { error: error as Error | null };
  }, [supabase, user, refreshProfile]);

  const updateProfileRole = useCallback(async (role: 'collector' | 'designer') => {
    if (!supabase || !user) return { error: new Error('Authentication required') };
    
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', user.id);
    
    if (!error) await refreshProfile();
    return { error: error as Error | null };
  }, [supabase, user, refreshProfile]);

  const acceptTerms = useCallback(async () => {
    if (!supabase || !user) return { error: new Error('Authentication required') };

    const { error } = await supabase
      .from('profiles')
      .update({ has_accepted_terms: true })
      .eq('id', user.id);

    if (!error) {
      // Immediate local and state persistence
      setTermsAccepted(true);
      localStorage.setItem(`atelier_terms_${user.id}`, 'true');
      await refreshProfile();
    }
    return { error: error as Error | null };
  }, [supabase, user, refreshProfile]);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return { error: new Error('Authentication required') };
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/update-password` : '/auth/update-password';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  }, [supabase]);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!supabase) return { error: new Error('Authentication required') };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  }, [supabase]);

  const value = useMemo(() => ({ 
    user, 
    session, 
    profile, 
    loading, 
    configured, 
    termsAccepted,
    isWaitlisted: profile?.is_waitlisted === true && profile?.role !== 'admin', 
    signUp, 
    signIn, 
    signOut, 
    refreshProfile, 
    updateProfileRole,
    requestAuthorization,
    acceptTerms,
    resetPassword,
    updatePassword
  }), [
    user, 
    session, 
    profile, 
    loading, 
    configured, 
    termsAccepted,
    refreshProfile, 
    signUp, 
    signIn, 
    signOut, 
    updateProfileRole,
    requestAuthorization,
    acceptTerms,
    resetPassword,
    updatePassword
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
