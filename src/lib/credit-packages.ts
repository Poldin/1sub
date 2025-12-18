/**
 * Shared Credit Package Definitions
 * 
 * Defines one-time credit purchase packages used across:
 * - Subscription page
 * - In-checkout dialogs
 * - Any other credit top-up UI
 * 
 * Keeps pricing and package definitions consistent across the platform.
 */

export interface CreditPackage {
  key: string;
  credits: number;
  price: number; // Price in EUR
  name: string;
  popular?: boolean;
  savings?: string;
  description?: string;
}

/**
 * Standard one-time credit packages
 * Pricing model: ~€0.10 per credit with volume discounts
 */
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    key: '100',
    credits: 100,
    price: 10.00,
    name: 'Starter Pack',
    popular: false,
    description: 'Perfect for trying out new tools',
  },
  {
    key: '500',
    credits: 500,
    price: 45.00,
    name: 'Pro Pack',
    popular: true,
    savings: '10% off',
    description: 'Best value for regular users',
  },
  {
    key: '1000',
    credits: 1000,
    price: 80.00,
    name: 'Enterprise Pack',
    popular: false,
    savings: '20% off',
    description: 'For heavy platform usage',
  },
];

/**
 * Get a specific credit package by key
 */
export function getCreditPackageByKey(key: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find(pkg => pkg.key === key);
}

/**
 * Get the effective price per credit for a package
 */
export function getPricePerCredit(packageKey: string): number | undefined {
  const pkg = getCreditPackageByKey(packageKey);
  if (!pkg) return undefined;
  return pkg.price / pkg.credits;
}

/**
 * Calculate the best package to cover a needed amount of credits
 */
export function getBestPackageForNeeds(needed: number): CreditPackage {
  // Find the smallest package that covers the need
  const coveringPackages = CREDIT_PACKAGES.filter(pkg => pkg.credits >= needed);
  
  if (coveringPackages.length > 0) {
    // Return the smallest one that covers it (best value for exact need)
    return coveringPackages[0];
  }
  
  // If no single package covers it, return the largest one
  return CREDIT_PACKAGES[CREDIT_PACKAGES.length - 1];
}

/**
 * Format credits for display (e.g., "100 CR" or "1,000 CR")
 */
export function formatCredits(amount: number): string {
  return amount.toLocaleString('en-US');
}

/**
 * Format price for display (e.g., "€10.00")
 */
export function formatPrice(amount: number): string {
  return `€${amount.toFixed(2)}`;
}














