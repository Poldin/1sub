// Client-side API helpers for 1sub application
import { supabaseClient } from './supabaseClient';

export interface TokenResponse {
  token: string;
  expiresAt: string;
  userId: string;
}

export interface ApiError {
  error: string;
  message?: string;
}

export async function launchTool(toolId: number): Promise<{ launchUrl: string; accessToken: string; expiresAt: string; userId: string; toolId: number }> {
  // Get the current session from Supabase
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No active session found. Please log in again.');
  }

  const response = await fetch('/api/v1/tools/launch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ toolId }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || error.error || 'Failed to launch tool');
  }

  return response.json();
}

export async function verifyUser(token: string): Promise<{ userId: string; email: string; verified: boolean; error?: string }> {
  try {
    const response = await fetch('/api/v1/verify-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      return { userId: '', email: '', verified: false, error: error.message || error.error };
    }

    return response.json();
  } catch (error) {
    return { userId: '', email: '', verified: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  }
}
