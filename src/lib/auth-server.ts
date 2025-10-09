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
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) return null;

    // Set session from cookies
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (sessionError || !sessionData.user) return null;

    // Get user profile from public.users table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', sessionData.user.id)
      .single();

    if (profileError || !profile) return null;

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
  } catch {
    return { error: 'Admin access required' };
  }
}
