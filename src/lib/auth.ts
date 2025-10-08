import { supabaseAdmin } from './supabaseAdmin';
import { UserRow } from '@/types/db';

export interface SessionUser {
  id: string;
  email: string;
  fullName?: string;
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


