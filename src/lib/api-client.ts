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

export async function generateAccessToken(): Promise<TokenResponse> {
  // Get the current session from Supabase
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No active session found. Please log in again.');
  }

  const response = await fetch('/api/v1/token/mint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || error.error || 'Failed to generate token');
  }

  return response.json();
}

export async function verifyToken(token: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const response = await fetch('/api/v1/verify-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    return { valid: false, error: error.message || error.error };
  }

  return response.json();
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
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
