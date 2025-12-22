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
