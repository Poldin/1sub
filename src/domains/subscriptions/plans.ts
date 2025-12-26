/**
 * Platform Subscription Plans
 *
 * Defines the recurring subscription plans for the 1sub platform.
 * Users subscribe to these plans to receive monthly credits.
 */

export interface PlatformSubscriptionPlan {
  id: string;
  name: string;
  description: string;
  creditsPerMonth: number;
  price: number; // Monthly price in EUR
  yearlyPrice: number; // Yearly price in EUR (discounted)
  stripePriceIdMonthly?: string; // Stripe Price ID for monthly billing
  stripePriceIdYearly?: string; // Stripe Price ID for yearly billing
  features: string[];
  popular?: boolean;
  maxOverdraft?: number; // Maximum overdraft allowed (0 = no overdraft)
}

export const PLATFORM_PLANS: PlatformSubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for trying out our platform',
    creditsPerMonth: 8,
    price: 9,
    yearlyPrice: 99,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID,
    features: [
      'Access to all tools',
      '8 credits/month (monthly)',
      '96 credits/year (yearly)',
      'Credits never expire',
      'Cancel anytime',
      'Email support'
    ],
    maxOverdraft: 0,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Most popular for professionals',
    creditsPerMonth: 29,
    price: 29,
    yearlyPrice: 299,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
    popular: true,
    features: [
      'Everything in Starter',
      '29 credits/month (monthly)',
      '348 credits/year (yearly)',
      'Priority support',
      'Early access to new tools',
      'Custom integrations',
      'Advanced analytics'
    ],
    maxOverdraft: 0,
  },
];

export function getPlanById(planId: string): PlatformSubscriptionPlan | undefined {
  return PLATFORM_PLANS.find(plan => plan.id === planId);
}

export function getPlanPrice(planId: string, billingPeriod: 'monthly' | 'yearly'): number | undefined {
  const plan = getPlanById(planId);
  if (!plan) return undefined;

  return billingPeriod === 'monthly' ? plan.price : plan.yearlyPrice;
}

export function getMonthlyEquivalent(planId: string, billingPeriod: 'monthly' | 'yearly'): number | undefined {
  const plan = getPlanById(planId);
  if (!plan) return undefined;

  return billingPeriod === 'monthly' ? plan.price : plan.yearlyPrice / 12;
}

/**
 * Get the Stripe Price ID for a specific plan and billing period
 */
export function getStripePriceId(planId: string, billingPeriod: 'monthly' | 'yearly'): string | undefined {
  const plan = getPlanById(planId);
  if (!plan) return undefined;

  return billingPeriod === 'monthly' ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly;
}
