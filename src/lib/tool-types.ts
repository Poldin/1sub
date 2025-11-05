/**
 * Unified Tool Type System
 * 
 * This file defines the complete type structure for tools that works across
 * homepage, backoffice, and vendor dashboard.
 */

// ============================================================================
// PRICING TYPES
// ============================================================================

export interface PricingOneTime {
  enabled: boolean;
  price: number;
  description?: string;
}

export interface PricingSubscription {
  enabled: boolean;
  price: number;
  interval: 'month' | 'year';
  trial_days?: number;
  description?: string;
}

export interface PricingUsageBased {
  enabled: boolean;
  price_per_unit: number;
  unit_name: string; // e.g., "per API call", "per GB", "per 1000 renders"
  minimum_units?: number;
  description?: string;
}

export interface PricingOptions {
  one_time?: PricingOneTime;
  subscription?: PricingSubscription;
  usage_based?: PricingUsageBased;
}

// ============================================================================
// UI METADATA TYPES
// ============================================================================

export type DevelopmentStage = 'alpha' | 'beta' | null;

export interface UIMetadata {
  emoji?: string;
  gradient?: string; // Tailwind gradient classes, e.g., "from-[#3ecf8e] to-[#2dd4bf]"
  hero_image_url?: string;
  logo_url?: string;
  tags?: string[];
  category?: string;
  verified?: boolean;
  development_stage?: DevelopmentStage;
  discount_percentage?: number;
}

// ============================================================================
// ENGAGEMENT METRICS TYPES
// ============================================================================

export interface EngagementMetrics {
  rating?: number; // 0-5 stars
  total_ratings?: number;
  adoption_count?: number; // Total users who have adopted the tool
  monthly_active_users?: number;
}

// ============================================================================
// CONTENT TYPES
// ============================================================================

export interface ContentMetadata {
  long_description?: string;
  features?: string[];
  use_cases?: string[];
}

// ============================================================================
// COMPLETE TOOL METADATA
// ============================================================================

export interface ToolMetadata {
  pricing_options?: PricingOptions;
  ui?: UIMetadata;
  engagement?: EngagementMetrics;
  content?: ContentMetadata;
  vendor_id?: string;
  
  // API key fields for external tool integration
  api_key_hash?: string;  // Hashed API key for storage
  api_key_created_at?: string;  // ISO timestamp
  api_key_last_used_at?: string;  // ISO timestamp
  api_key_active?: boolean;  // For revocation
  
  // Legacy fields for backward compatibility
  icon?: string;
  category?: string;
  pricing_type?: string;
  subscription_period?: string;
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface ProductPricingModel {
  one_time?: {
    enabled: boolean;
    type: 'absolute' | 'range';
    price?: number;
    min_price?: number;
    max_price?: number;
  };
  subscription?: {
    enabled: boolean;
    price: number;
    interval: 'month' | 'year';
    trial_days?: number;
  };
  usage_based?: {
    enabled: boolean;
    price_per_unit: number;
    unit_name: string;
    minimum_units?: number;
  };
}

export interface ToolProduct {
  id: string;
  tool_id: string;
  name: string;
  description?: string;
  pricing_model: ProductPricingModel;
  is_active: boolean;
  created_at: string;
  
  // Display metadata
  features?: string[];
  is_preferred?: boolean;
  display_order?: number;
}

// ============================================================================
// COMPLETE TOOL TYPE
// ============================================================================

export interface Tool {
  id: string;
  name: string;
  description: string | null;
  url: string;
  is_active: boolean | null;
  metadata: ToolMetadata | null;
  user_profile_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  
  // Related data (when joined)
  products?: ToolProduct[];
}

// ============================================================================
// HOMEPAGE DISPLAY FORMAT
// ============================================================================

export interface HomepageToolCardProps {
  id: string | number;
  name: string;
  description: string;
  longDescription?: string;
  emoji?: string;
  logoUrl?: string;
  imageUrl?: string;
  rating: number;
  adoptions: number;
  
  // Pricing (simplified for display)
  price?: number; // Legacy support
  pricing?: {
    monthly?: number;
    oneTime?: number;
    consumption?: {
      price: number;
      unit: string;
    };
  };
  
  // Products (for multi-tier tools)
  products?: {
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
  }[];
  
  // Visual
  gradient?: string;
  tags?: string[];
  verified?: boolean;
  discount?: number;
  developmentStage?: DevelopmentStage;
  
  // Actions
  ctaLabel?: string;
  onClick?: () => void;
  onViewClick?: () => void;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface ToolWithProducts extends Tool {
  products: ToolProduct[];
}

// Default values
export const DEFAULT_UI_METADATA: Required<UIMetadata> = {
  emoji: '🔧',
  gradient: 'from-blue-500 to-purple-600',
  hero_image_url: '',
  logo_url: '',
  tags: [],
  category: 'general',
  verified: false,
  development_stage: null,
  discount_percentage: 0,
};

export const DEFAULT_ENGAGEMENT_METRICS: Required<EngagementMetrics> = {
  rating: 4.5,
  total_ratings: 0,
  adoption_count: 0,
  monthly_active_users: 0,
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function hasProducts(tool: Tool): tool is ToolWithProducts {
  return Array.isArray(tool.products) && tool.products.length > 0;
}

export function hasPricingOptions(metadata: ToolMetadata | null): metadata is ToolMetadata & { pricing_options: PricingOptions } {
  return metadata !== null && metadata.pricing_options !== undefined;
}

export function hasUIMetadata(metadata: ToolMetadata | null): metadata is ToolMetadata & { ui: UIMetadata } {
  return metadata !== null && metadata.ui !== undefined;
}


