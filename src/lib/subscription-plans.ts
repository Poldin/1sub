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
  price: number; // Monthly price in USD
  yearlyPrice: number; // Yearly price in USD (discounted)
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
    description: 'Perfect for trying out the platform',
    creditsPerMonth: 50,
    price: 50,
    yearlyPrice: 540, // 10% discount
    features: [
      '50 credits per month',
      'Access to all tools',
      'Standard support',
      'Cancel anytime',
    ],
    maxOverdraft: 0,
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Best for regular users',
    creditsPerMonth: 150,
    price: 150,
    yearlyPrice: 1620, // 10% discount
    popular: true,
    features: [
      '150 credits per month',
      'Access to all tools',
      'Priority support',
      '50 credit overdraft',
      'Cancel anytime',
    ],
    maxOverdraft: 50,
  },
  {
    id: 'business',
    name: 'Business',
    description: 'For power users and small teams',
    creditsPerMonth: 300,
    price: 300,
    yearlyPrice: 3240, // 10% discount
    features: [
      '300 credits per month',
      'Access to all tools',
      'Priority support',
      '100 credit overdraft',
      'Usage analytics',
      'Cancel anytime',
    ],
    maxOverdraft: 100,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For teams and organizations',
    creditsPerMonth: 1000,
    price: 1000,
    yearlyPrice: 10800, // 10% discount
    features: [
      '1000 credits per month',
      'Access to all tools',
      'Dedicated support',
      '200 credit overdraft',
      'Advanced analytics',
      'API access',
      'Cancel anytime',
    ],
    maxOverdraft: 200,
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


