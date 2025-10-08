import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';

export interface UseUser {
  user: { id: string; email: string } | null;
  loading: boolean;
}

export function useUser(): UseUser {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabaseClient.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? '' } : null);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading };
}


