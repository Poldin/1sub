/**
 * Payments Domain - Public API
 *
 * Handles Stripe Connect account management and vendor payout processing.
 */

export {
  createConnectAccount,
  createAccountLink,
  getAccountDetails,
  updateAccountStatus,
  getVendorCreditBalance,
  scheduleVendorPayout,
  processVendorPayout,
  getNextPayoutDate,
  getMinimumPayoutThreshold,
  type VendorStripeAccount,
  type VendorPayout,
} from './service';
