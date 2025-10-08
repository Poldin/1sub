import { cookies } from 'next/headers';
import { supabaseClient } from './supabaseClient';
import { supabaseAdmin } from './supabaseAdmin';
import { SessionUser } from './auth';

export async function getSessionUser(): Promise<SessionUser | null> {
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
      .select('id, email, full_name')
      .eq('id', sessionData.user.id)
      .single();

    if (profileError || !profile) return null;

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name
    };
  } catch (error) {
    console.error('Error getting session user:', error);
    return null;
  }
}
