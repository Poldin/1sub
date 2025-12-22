/**
 * API Key Generation
 *
 * CANONICAL SOURCE: All API key generation MUST use this module.
 */

import bcrypt from 'bcryptjs';

const API_KEY_PREFIX = 'sk-tool-';
const API_KEY_LENGTH = 32;
const SALT_ROUNDS = 10;

/**
 * Generate a new API key
 * Format: sk-tool-{random_alphanumeric}
 */
export function generateApiKey(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = API_KEY_PREFIX;

  for (let i = 0; i < API_KEY_LENGTH; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
}

/**
 * Hash an API key for secure storage
 * Uses bcrypt with 10 rounds
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, SALT_ROUNDS);
}

/**
 * Extract prefix from API key for lookup optimization
 */
export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 8);
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  return apiKey.startsWith(API_KEY_PREFIX) && apiKey.length >= API_KEY_PREFIX.length + 10;
}
