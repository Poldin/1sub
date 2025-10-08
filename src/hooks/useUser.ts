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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    let isMounted = true;

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!isMounted) return;
      
      if (session?.user) {
        // Use basic user info from auth session
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || null
        });
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          // Use basic user info from auth session
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || null
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [mounted]);

  return { user, loading };
}


