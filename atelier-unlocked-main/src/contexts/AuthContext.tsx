'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  useEffect(() => {
    // If Supabase is not configured, just set loading to false and return
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch profile when session changes
        if (session?.user) {
          // Wait a bit longer for database trigger to complete
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 1000);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const fetchProfile = async (userId: string) => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      // maybeSingle() returns null data (not an error) when no row is found
      // Empty error objects are normal and mean "not found"
      // We don't log errors here - they're handled silently
      
      if (data) {
        setProfile(data);
      } else {
        // No profile found - this is normal for new users
        setProfile(null);
      }
    } catch (err) {
      // Catch any unexpected errors
      console.error('Unexpected error fetching profile:', err);
      setProfile(null);
    }
  };

  const signUp = async (email: string, password: string, displayName?: string, role: 'collector' | 'designer' = 'collector') => {
    if (!supabase) {
      return { error: new Error('Authentication not configured') };
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
      return { error: new Error('Authentication not configured') };
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
