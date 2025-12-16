'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  signUp: (email: string, password: string, displayName?: string, role?: 'collector' | 'designer') => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = getSupabaseClient();
  const configured = supabase !== null;

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (data) {
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (err) {
      setProfile(null);
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 1000);
        } else {
          setProfile(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signUp = async (email: string, password: string, displayName?: string, role: 'collector' | 'designer' = 'collector') => {
    if (!supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const errorMsg = !url && !key 
        ? 'Authentication not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your environment variables.'
        : !url 
        ? 'NEXT_PUBLIC_SUPABASE_URL is missing. Please set it in your environment variables.'
        : !key 
        ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing. Please set it in your environment variables.'
        : 'Authentication not configured. Please check your Supabase environment variables.';
      return { error: new Error(errorMsg) };
    }
    
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split('@')[0],
          role: role,
        },
      },
    });
    
    // If signup successful and user is created, wait for profile to be created by trigger
    if (!error && data.user) {
      // Wait a bit for the database trigger to create the profile
      setTimeout(() => {
        fetchProfile(data.user.id);
      }, 500);
    }
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const errorMsg = !url && !key 
        ? 'Authentication not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your environment variables.'
        : !url 
        ? 'NEXT_PUBLIC_SUPABASE_URL is missing. Please set it in your environment variables.'
        : !key 
        ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing. Please set it in your environment variables.'
        : 'Authentication not configured. Please check your Supabase environment variables.';
      return { error: new Error(errorMsg) };
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    if (!supabase) return;
    
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!user || !supabase) return;
    await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, configured, signUp, signIn, signOut, refreshProfile }}>
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
