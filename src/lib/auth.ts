import { cookies } from 'next/headers';
import { supabaseClient } from './supabaseClient';

export interface SessionUser {
  id: string;
  email: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  // Placeholder: customize according to your auth strategy
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;
  if (!token) return null;

  const { data } = await supabaseClient.auth.getUser(token);
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? '' };
}


