/**
 * Product transformation utilities
 * Converts database product format to component-friendly format
 */

// Database product format (from tool_products table)
export interface DatabaseProduct {
  id: string;
  name: string;
  description: string | null;
  tool_id: string;
  is_active: boolean;
  created_at: string;
  pricing_model?: {
    pricing_model?: {
      one_time?: {
        enabled: boolean;
        price?: number;
        type?: 'absolute' | 'range';
        min_price?: number;
        max_price?: number;
      };
      subscription?: {
        enabled: boolean;
        price?: number;
        interval?: 'month' | 'year';
        trial_days?: number;
      };
      usage_based?: {
        enabled: boolean;
        price_per_unit?: number;
        unit_name?: string;
        minimum_units?: number;
      };
    };
    image_url?: string;
  } | null;
}

// Component product format (expected by ToolCard/ToolDialog)
export interface ComponentProduct {
  id: string;
  name: string;
  description?: string;
  pricing: {
    monthly?: number;
    oneTime?: number;
    consumption?: {
      price: number;
      unit: string;
    };
  };
  features?: string[];
  isPreferred?: boolean;
}

/**
 * Transform a single database product to component format
 */
export function transformProduct(
  dbProduct: DatabaseProduct,
  isPreferred: boolean = false
): ComponentProduct | null {
  // Skip inactive products
  if (!dbProduct.is_active) {
    return null;
  }

  const pricingModel = dbProduct.pricing_model?.pricing_model;
  const pricing: ComponentProduct['pricing'] = {};

  // Transform pricing models
  if (pricingModel) {
    // One-time pricing
    if (pricingModel.one_time?.enabled && pricingModel.one_time.price) {
      pricing.oneTime = pricingModel.one_time.price;
    }

    // Subscription pricing (convert to monthly or yearly based on interval)
    if (pricingModel.subscription?.enabled && pricingModel.subscription.price) {
      if (pricingModel.subscription.interval === 'month') {
        pricing.monthly = pricingModel.subscription.price;
      }
      // For yearly subscriptions, we could add a separate field or convert to monthly
      // For now, treating yearly as monthly equivalent
      else if (pricingModel.subscription.interval === 'year') {
        pricing.monthly = pricingModel.subscription.price;
      }
    }

    // Usage-based pricing (consumption)
    if (
      pricingModel.usage_based?.enabled &&
      pricingModel.usage_based.price_per_unit &&
      pricingModel.usage_based.unit_name
    ) {
      pricing.consumption = {
        price: pricingModel.usage_based.price_per_unit,
        unit: pricingModel.usage_based.unit_name,
      };
    }
  }

  // Return null if no pricing is available
  if (!pricing.monthly && !pricing.oneTime && !pricing.consumption) {
    return null;
  }

  return {
    id: dbProduct.id,
    name: dbProduct.name,
    description: dbProduct.description || undefined,
    pricing,
    features: [], // Could be added later if needed
    isPreferred,
  };
}

/**
 * Transform an array of database products to component format
 * Marks the first product as preferred if no other criteria exists
 */
export function transformProducts(
  dbProducts: DatabaseProduct[]
): ComponentProduct[] {
  if (!dbProducts || dbProducts.length === 0) {
    return [];
  }

  const transformed: ComponentProduct[] = [];
  let preferredSet = false;

  for (let i = 0; i < dbProducts.length; i++) {
    const product = transformProduct(dbProducts[i], !preferredSet && i === 0);
    if (product) {
      transformed.push(product);
      if (product.isPreferred) {
        preferredSet = true;
      }
    }
  }

  return transformed;
}

/**
 * Get pricing information from a database product for display purposes
 */
export function getProductPricing(dbProduct: DatabaseProduct): {
  price: number;
  label: string;
} | null {
  const pricingModel = dbProduct.pricing_model?.pricing_model;

  if (!pricingModel) {
    return null;
  }

  // Priority: subscription > one-time > usage-based
  if (pricingModel.subscription?.enabled && pricingModel.subscription.price) {
    const interval = pricingModel.subscription.interval || 'month';
    // Normalize interval display
    const intervalLabels: Record<string, string> = {
      'day': '/day',
      'week': '/wk',
      'month': '/mo',
      'year': '/yr',
    };
    const intervalLabel = intervalLabels[interval] || `/${interval}`;
    
    return {
      price: pricingModel.subscription.price,
      label: intervalLabel,
    };
  }

  if (pricingModel.one_time?.enabled && pricingModel.one_time.price) {
    return {
      price: pricingModel.one_time.price,
      label: 'one-time',
    };
  }

  if (
    pricingModel.usage_based?.enabled &&
    pricingModel.usage_based.price_per_unit
  ) {
    return {
      price: pricingModel.usage_based.price_per_unit,
      label: `per ${pricingModel.usage_based.unit_name || 'unit'}`,
    };
  }

  return null;
}

/**
 * Get all enabled pricing models for a product
 * Returns an array of pricing options with their types, prices, and labels
 */
export interface PricingOption {
  type: 'one_time' | 'subscription' | 'usage_based';
  price: number;
  label: string;
  description: string;
}

export function getAllEnabledPricingModels(dbProduct: DatabaseProduct): PricingOption[] {
  const pricingModel = dbProduct.pricing_model?.pricing_model;
  const options: PricingOption[] = [];

  if (!pricingModel) {
    return options;
  }

  // Check one-time pricing
  if (pricingModel.one_time?.enabled && pricingModel.one_time.price) {
    options.push({
      type: 'one_time',
      price: pricingModel.one_time.price,
      label: 'credits',
      description: 'One-time',
    });
  }

  // Check subscription pricing
  if (pricingModel.subscription?.enabled && pricingModel.subscription.price) {
    const interval = pricingModel.subscription.interval || 'month';
    // Normalize interval display
    const intervalLabels: Record<string, string> = {
      'day': '/day',
      'week': '/wk',
      'month': '/mo',
      'year': '/yr',
    };
    const intervalLabel = intervalLabels[interval] || `/${interval}`;
    
    options.push({
      type: 'subscription',
      price: pricingModel.subscription.price,
      label: intervalLabel,
      description: `Subscription`,
    });
  }

  // Check usage-based pricing
  if (pricingModel.usage_based?.enabled && pricingModel.usage_based.price_per_unit) {
    const unitName = pricingModel.usage_based.unit_name || 'unit';
    const pricePerUnit = pricingModel.usage_based.price_per_unit;
    const minimumUnits = pricingModel.usage_based.minimum_units || 1;
    
    // Calculate minimum purchase amount
    const minimumPrice = pricePerUnit * minimumUnits;
    
    // Show minimum price with breakdown in label
    options.push({
      type: 'usage_based',
      price: minimumPrice,
      label: minimumUnits > 1 
        ? `(${minimumUnits} ${unitName}${minimumUnits > 1 ? 's' : ''} min)` 
        : `per ${unitName}`,
      description: minimumUnits > 1 
        ? `Usage-based: ${pricePerUnit} per ${unitName}`
        : 'Usage-based',
    });
  }

  return options;
}

