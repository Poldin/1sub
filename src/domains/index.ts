/**
 * Domains Layer - Public API
 *
 * This is the main entry point for all domain services.
 * Each domain encapsulates business logic for a specific area.
 *
 * Import from here for clean, centralized access:
 *   import { getCurrentBalance, verifyToken } from '@/domains';
 *
 * Or import from specific domains:
 *   import { getCurrentBalance } from '@/domains/credits';
 *   import { verifyToken } from '@/domains/auth';
 */

// Re-export all domains
export * from './auth';
export * from './credits';
export * from './verification';
export * from './checkout';
export * from './tools';
export * from './subscriptions';
export * from './vendors';
export * from './payments';
export * from './webhooks';
