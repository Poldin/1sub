/**
 * Credits Domain - Public API
 *
 * CANONICAL SOURCE: All credit operations MUST use this module.
 */

export {
  // Balance queries
  getCurrentBalance,
  getCurrentBalanceService,
  // Credit operations
  addCredits,
  subtractCredits,
  consumeCreditsViaApi,
  // Validation
  validateBalance,
  // History
  getTransactionHistory,
  // Types
  type CreditTransaction,
  type AddCreditsParams,
  type SubtractCreditsParams,
  type CreditOperationResult,
  type BalanceValidationResult,
} from './service';

// Note: Credit package definitions are in ./packages.ts
// Not exported here to avoid naming conflict with checkout domain's CREDIT_PACKAGES
// Import directly from '@/domains/credits/packages' if needed
