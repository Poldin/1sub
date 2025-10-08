import { cookies } from 'next/headers';
import { supabaseClient, supabaseAdmin } from './supabaseClient';
import { UserRow } from '@/types/db';

export interface SessionUser {
  id: string;
  email: string;
  fullName?: string;
}

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

export async function createUserProfile(userId: string, email: string, fullName?: string): Promise<UserRow | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: fullName
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating user profile:', error);
    return null;
  }
}


