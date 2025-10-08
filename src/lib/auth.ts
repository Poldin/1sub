import { UserRow } from '@/types/db';

export interface SessionUser {
  id: string;
  email: string;
  fullName?: string;
}

// This function should be called from a server action or API route
export async function createUserProfile(userId: string, email: string, fullName?: string): Promise<UserRow | null> {
  try {
    // This will be handled by a server action
    const response = await fetch('/api/v1/create-user-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        email,
        fullName
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create user profile');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating user profile:', error);
    return null;
  }
}


