import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  approval_status: ApprovalStatus;
  is_admin: boolean;
  has_setup_tracking: boolean;
  created_at: string;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async (userId: string, accessToken?: string) => {
      console.log('loadProfile called for user:', userId);
      try {
        console.log('fetching profile array...');

        // Use native fetch to completely bypass any supabase-js SDK queuing/hanging bugs
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
          {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        let data = null;
        let error = null;

        if (response.ok) {
          data = await response.json();
        } else {
          error = await response.json();
        }

        console.log('loadProfile response:', { data, error });
        if (error) {
          console.error('Error fetching profile:', error.message);
          setProfile(null);
        } else if (data && data.length > 0) {
          setProfile(data[0]);
        } else {
          console.log('Profile is empty array');
          setProfile(null);
        }
      } catch (err: any) {
        console.error('Unexpected error fetching profile:', err.message || err);
      } finally {
        setLoading(false);
      }
    };

    // Initialize session
    const initializeAuth = async () => {
      console.log('initializeAuth starting');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('initializeAuth session fetched:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id, session.access_token);
      } else {
        console.log('No user in session, setting loading to false');
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('onAuthStateChange fired:', event, session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        await loadProfile(session.user.id, session.access_token);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
