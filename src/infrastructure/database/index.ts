/**
 * Database Infrastructure - Public API
 */

export {
  createBrowserClient,
  createServerClient,
  createServiceClient,
  safeGetUser,
  handleAuthError,
  // Legacy alias (deprecated)
  createClient,
} from './client';
