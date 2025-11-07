/**
 * Client-Safe API Key Utilities
 * 
 * Functions that can be used in client components without importing server-side code.
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Generate a unique API key for a tool
 * Format: sk-tool-{random}
 * @returns Generated API key string
 */
export function generateApiKey(): string {
  const randomPart = Math.random().toString(36).substring(2, 38);
  return `sk-tool-${randomPart}`;
}

/**
 * Hash an API key for secure storage
 * @param key - The API key to hash
 * @returns Hashed API key
 */
export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, SALT_ROUNDS);
}

/**
 * Verify an API key against a stored hash
 * @param inputKey - The API key provided by the client
 * @param storedHash - The hashed API key stored in the database
 * @returns true if the key matches, false otherwise
 */
export async function verifyApiKey(
  inputKey: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash) {
    return false;
  }
  return bcrypt.compare(inputKey, storedHash);
}


