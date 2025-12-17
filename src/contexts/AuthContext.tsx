'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

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

  const refreshUserInfo = async () => {
    if (user) {
      await fetchUserInfo(user);
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // Initial check
    const checkUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);
        
        if (authUser) {
          await fetchUserInfo(authUser);
        } else {
          setUserInfo(null);
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        const authUser = session?.user ?? null;
        setUser(authUser);
        
        if (authUser) {
          await fetchUserInfo(authUser);
        } else {
          setUserInfo(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
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

