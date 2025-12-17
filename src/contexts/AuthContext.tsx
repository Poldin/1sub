'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, AuthChangeEvent, Session, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  credits: number | null; // null = fetch failed
}

interface AuthContextType {
  user: User | null;
  userInfo: UserInfo | null;
  isLoggedIn: boolean;
  loading: boolean;
  creditsLoading: boolean;
  refreshUserInfo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userInfo: null,
  isLoggedIn: false,
  loading: true,
  creditsLoading: false,
  refreshUserInfo: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [creditsLoading, setCreditsLoading] = useState(false);
  
  // Ref to store the Realtime subscription channel
  const balanceChannelRef = useRef<RealtimeChannel | null>(null);
  
  // Ref to track if initial fetch has been done (prevents refetching on tab focus)
  const hasInitializedRef = useRef<boolean>(false);

  // Fetch user info ONCE on initial load/login
  const fetchUserInfo = async (authUser: User) => {
    try {
      setCreditsLoading(true);
      
      // Fetch ALL user data from the profile API (includes credits)
      const response = await fetch('/api/user/profile');
      
      if (!response.ok) {
        throw new Error(`Profile API returned ${response.status}`);
      }
      
      const userData = await response.json();
      
      // Set user info with all data from API
      setUserInfo({
        id: authUser.id,
        email: authUser.email || userData.email || '',
        fullName: userData.fullName || authUser.email?.split('@')[0] || 'User',
        credits: userData.credits ?? null, // Use credits from API
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
      // Set basic info with null credits on error
      setUserInfo({
        id: authUser.id,
        email: authUser.email || '',
        fullName: authUser.email?.split('@')[0] || 'User',
        credits: null,
      });
    } finally {
      setCreditsLoading(false);
    }
  };

  // Setup Realtime subscription for balance updates
  const setupBalanceSubscription = (userId: string) => {
    const supabase = createClient();
    
    // Cleanup existing subscription if any
    if (balanceChannelRef.current) {
      balanceChannelRef.current.unsubscribe();
      balanceChannelRef.current = null;
    }

    // Create new subscription for this user's balance
    const channel = supabase
      .channel(`user-balance-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'user_balances',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ balance: number }>) => {
          console.log('Balance update received:', payload);
          
          // Update credits in real-time when balance changes
          const newData = payload.new as { balance?: number };
          if (newData && typeof newData.balance === 'number') {
            setUserInfo(prev => {
              if (!prev) return null;
              return {
                ...prev,
                credits: newData.balance!,
              };
            });
          }
        }
      )
      .subscribe((status: string) => {
        console.log('Balance subscription status:', status);
      });

    balanceChannelRef.current = channel;
  };

  // Cleanup balance subscription
  const cleanupBalanceSubscription = () => {
    if (balanceChannelRef.current) {
      balanceChannelRef.current.unsubscribe();
      balanceChannelRef.current = null;
    }
  };

  // Manual refresh function (used after payments, etc.)
  const refreshUserInfo = async () => {
    if (user) {
      await fetchUserInfo(user);
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // Initial check (only on first mount, not on tab focus)
    const checkUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);
        
        if (authUser && !hasInitializedRef.current) {
          // Fetch initial user info (including credits) ONLY ONCE
          await fetchUserInfo(authUser);
          // Setup Realtime subscription for balance updates
          setupBalanceSubscription(authUser.id);
          hasInitializedRef.current = true;
        } else if (!authUser) {
          setUserInfo(null);
          hasInitializedRef.current = false;
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setUser(null);
        setUserInfo(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes (ONLY actual login/logout, ignore everything else)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth event:', event);
        
        const authUser = session?.user ?? null;
        
        // Only handle explicit SIGN IN and SIGN OUT events
        if (event === 'SIGNED_IN') {
          // Update user reference (but keep existing userInfo to avoid flicker)
          setUser(authUser);
          
          // Only fetch if not already initialized (prevents refetch on cross-tab SIGNED_IN events)
          if (authUser && !hasInitializedRef.current) {
            await fetchUserInfo(authUser);
            setupBalanceSubscription(authUser.id);
            hasInitializedRef.current = true;
          }
          
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          // Only clear state on actual sign out
          setUser(null);
          setUserInfo(null);
          cleanupBalanceSubscription();
          hasInitializedRef.current = false;
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          // Just update the user reference, keep existing userInfo (prevents flicker)
          setUser(authUser);
        }
        // IGNORE all other events:
        // - INITIAL_SESSION: already handled by checkUser()
        // Realtime subscription will handle balance changes automatically
      }
    );

    return () => {
      subscription.unsubscribe();
      cleanupBalanceSubscription();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userInfo,
        isLoggedIn: !!user,
        loading,
        creditsLoading,
        refreshUserInfo,
      }}
    >
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

