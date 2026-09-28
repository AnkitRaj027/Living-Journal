import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { AuthState, UserProfile } from '../types/journal';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  authState: AuthState;
  authError: string | null;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authState, setAuthState] = useState<AuthState>('initializing');
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync / create profile in public.profiles table
  const syncProfile = useCallback(async (currentUser: User): Promise<UserProfile> => {
    const meta = currentUser.user_metadata || {};
    const defaultProfile: UserProfile = {
      id: currentUser.id,
      email: currentUser.email || null,
      displayName: meta.full_name || meta.name || currentUser.email?.split('@')[0] || 'Diariest',
      avatarUrl: meta.avatar_url || meta.picture || null,
    };

    if (!isSupabaseConfigured) {
      setProfile(defaultProfile);
      return defaultProfile;
    }

    try {
      // Query profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (data && !error) {
        const loadedProfile: UserProfile = {
          id: data.id,
          email: data.email,
          displayName: data.display_name || defaultProfile.displayName,
          avatarUrl: data.avatar_url || defaultProfile.avatarUrl,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        setProfile(loadedProfile);
        return loadedProfile;
      }

      // If profile does not exist yet, upsert it
      const { data: upsertedData } = await supabase
        .from('profiles')
        .upsert({
          id: currentUser.id,
          email: defaultProfile.email,
          display_name: defaultProfile.displayName,
          avatar_url: defaultProfile.avatarUrl,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (upsertedData) {
        const loadedProfile: UserProfile = {
          id: upsertedData.id,
          email: upsertedData.email,
          displayName: upsertedData.display_name,
          avatarUrl: upsertedData.avatar_url,
          createdAt: upsertedData.created_at,
          updatedAt: upsertedData.updated_at
        };
        setProfile(loadedProfile);
        return loadedProfile;
      }
    } catch {
      // Non-blocking fallback
    }

    setProfile(defaultProfile);
    return defaultProfile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await syncProfile(user);
    }
  }, [user, syncProfile]);

  // Initialize auth state and listen for session changes
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthState('unauthenticated');
      return;
    }

    let isMounted = true;

    // Check existing session
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!isMounted) return;
      if (error) {
        setAuthError(error.message);
        setAuthState('unauthenticated');
        return;
      }

      if (initialSession?.user) {
        setSession(initialSession);
        setUser(initialSession.user);
        syncProfile(initialSession.user);
        setAuthState('authenticated');
      } else {
        setAuthState('unauthenticated');
      }
    }).catch(() => {
      if (isMounted) setAuthState('unauthenticated');
    });

    // Listen for auth state transitions (OAuth redirects, token refresh, sign in, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (currentSession?.user) {
            setSession(currentSession);
            setUser(currentSession.user);
            setAuthError(null);
            await syncProfile(currentSession.user);
            setAuthState('authenticated');
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setAuthState('unauthenticated');
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncProfile]);

  // Google OAuth sign-in flow
  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);

    if (!isSupabaseConfigured) {
      setAuthError('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    try {
      setAuthState('authenticating');
      // Redirect back to current origin
      const redirectUrl = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to sign in with Google. Please try again.';
      setAuthError(message);
      setAuthState(user ? 'authenticated' : 'unauthenticated');
    }
  }, [user]);

  // Sign out flow
  const signOut = useCallback(async () => {
    setAuthState('signing_out');
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Sign-out error:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
      setAuthState('unauthenticated');
    }
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        authState,
        authError,
        isConfigured: isSupabaseConfigured,
        signInWithGoogle,
        signOut,
        clearAuthError,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
