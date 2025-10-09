import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { SessionUser } from '@/lib/auth';

export interface UserWithRole extends SessionUser {
  role?: 'admin' | 'user';
}

export interface UseUser {
  user: UserWithRole | null;
  loading: boolean;
}

export function useUser(): UseUser {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    let isMounted = true;

    // Get initial session and user profile
    const getInitialSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!isMounted) return;
      
      console.log('useUser: Initial session:', session?.user?.email);
      
      if (session?.user) {
        try {
          // Get user profile with role via API endpoint
          const response = await fetch(`/api/v1/user/profile?userId=${session.user.id}`);
          const profileData = await response.json();

          console.log('useUser: Profile data:', profileData);

          if (response.ok && profileData.id) {
            console.log('useUser: Setting user with role:', profileData.role);
            setUser({
              id: profileData.id,
              email: profileData.email,
              fullName: profileData.fullName,
              role: profileData.role || 'user'
            });
          } else {
            console.log('useUser: API error, using fallback');
            // Fallback to auth session data
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              fullName: session.user.user_metadata?.full_name || null,
              role: 'user'
            });
          }
        } catch (error) {
          console.log('useUser: Fetch error, using fallback:', error);
          // Fallback to auth session data
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || null,
            role: 'user'
          });
        }
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          try {
            // Get user profile with role via API endpoint
            const response = await fetch(`/api/v1/user/profile?userId=${session.user.id}`);
            const profileData = await response.json();

            if (response.ok && profileData.id) {
              setUser({
                id: profileData.id,
                email: profileData.email,
                fullName: profileData.fullName,
                role: profileData.role || 'user'
              });
            } else {
              // Fallback to auth session data
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                fullName: session.user.user_metadata?.full_name || null,
                role: 'user'
              });
            }
          } catch (error) {
            // Fallback to auth session data
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              fullName: session.user.user_metadata?.full_name || null,
              role: 'user'
            });
          }
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


