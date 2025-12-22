/**
 * Checkout Domain - Public API
 *
 * CANONICAL SOURCE: All checkout operations MUST use this module.
 *
 * Two separate checkout flows:
 * 1. Tool Checkout - For purchasing tool subscriptions/access
 * 2. Credit Checkout - For purchasing credit packages
 */

// Tool Checkout (subscriptions)
export {
  createToolCheckout,
  completeToolCheckout,
  getToolCheckout,
  getToolCheckoutBySession,
  getUserToolCheckouts,
  type ToolCheckoutParams,
  type ToolCheckoutResult,
  type ToolCheckoutRecord,
} from './tool-checkout';

// Credit Checkout (credit packages)
export {
  createCreditCheckout,
  completeCreditCheckout,
  getCreditCheckout,
  getCreditCheckoutBySession,
  getUserCreditCheckouts,
  getCreditPackage,
  getCreditPackageByPriceId,
  CREDIT_PACKAGES,
  type CreditPackage,
  type CreditCheckoutParams,
  type CreditCheckoutResult,
  type CreditCheckoutRecord,
} from './credit-checkout';
