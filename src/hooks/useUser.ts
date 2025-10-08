import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { SessionUser } from '@/lib/auth';

export interface UseUser {
  user: SessionUser | null;
  loading: boolean;
}

export function useUser(): UseUser {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!mounted) return;
      
      if (session?.user) {
        // Get user profile from public.users table
        const { data: profile } = await supabaseClient
          .from('users')
          .select('id, email, full_name')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setUser({
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name
          });
        }
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          // Get user profile
          const { data: profile } = await supabaseClient
            .from('users')
            .select('id, email, full_name')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              fullName: profile.full_name
            });
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}


