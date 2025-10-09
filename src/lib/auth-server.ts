import { cookies } from 'next/headers';
import { supabaseClient } from './supabaseClient';
import { supabaseAdmin } from './supabaseAdmin';
import { SessionUser } from './auth';

export interface AdminUser extends SessionUser {
  role: 'admin' | 'user';
}

export async function getSessionUser(): Promise<AdminUser | null> {
  try {
    const cookieStore = await cookies();
    
    // Get all Supabase auth cookies
    const authCookies = cookieStore.getAll().filter(cookie => 
      cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')
    );

    if (authCookies.length === 0) {
      console.log('No Supabase auth cookies found');
      return null;
    }

    // Try to get session using the existing supabaseClient
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError || !session?.user) {
      console.log('No valid session found:', sessionError?.message);
      return null;
    }

    // Get user profile from public.users table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.log('Error fetching user profile:', profileError.message);
      return null;
    }

    if (!profile) {
      console.log('No user profile found for ID:', session.user.id);
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role || 'user'
    };
  } catch (error) {
    console.error('Error getting session user:', error);
    return null;
  }
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  return user?.role === 'admin';
}

/**
 * Get admin user or throw error if not admin
 */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return user;
}

/**
 * Middleware helper to check admin access
 */
export async function checkAdminAccess(): Promise<{ user: AdminUser } | { error: string }> {
  try {
    const user = await requireAdmin();
    return { user };
  } catch (error) {
    return { error: 'Admin access required' };
  }
}
