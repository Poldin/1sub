/**
 * Types for tool subscription verification and user linking
 */

// ===========================================================================
// Tool User Link Types
// ===========================================================================

export interface ToolUserLink {
  id: string;
  tool_id: string;
  onesub_user_id: string;
  tool_user_id: string;
  link_method: 'jwt_redirect' | 'link_code' | 'email_link';
  linked_at: string;
  last_verified_at: string | null;
  metadata?: Record<string, unknown>;
}

// ===========================================================================
// Tool Link Code Types
// ===========================================================================

export interface ToolLinkCode {
  id: string;
  code: string;
  tool_id: string;
  onesub_user_id: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  is_used: boolean;
  tool_user_id: string | null;
  metadata?: Record<string, unknown>;
}

// ===========================================================================
// JWKS Types
// ===========================================================================

export interface JWKSKey {
  id: string;
  kid: string;
  key_type: 'RSA' | 'EC';
  algorithm: 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512';
  public_key: string;
  private_key_ref: string | null;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  is_primary: boolean;
  metadata?: Record<string, unknown>;
}

// ===========================================================================
// API Request/Response Types
// ===========================================================================

// Verify Subscription Request
export interface VerifySubscriptionRequest {
  oneSubUserId?: string;
  toolUserId?: string;
  emailSha256?: string;
}

// Verify Subscription Response
export type SubscriptionStatus = 
  | 'trialing' 
  | 'active' 
  | 'past_due' 
  | 'canceled' 
  | 'incomplete' 
  | 'incomplete_expired';

export type PaymentStatus = 'paid' | 'failed' | 'pending';

export interface VerifySubscriptionResponse {
  oneSubUserId?: string;
  active: boolean;
  status: SubscriptionStatus;
  planId: string;
  productId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  seats: number;
  quantity: number;
  trialEndsAt?: string;
  lastPaymentStatus?: PaymentStatus;
  creditsRemaining?: number;
}

// Exchange Code Request
export interface ExchangeCodeRequest {
  code: string;
  toolUserId: string;
}

// Exchange Code Response
export interface ExchangeCodeResponse {
  linked: boolean;
  oneSubUserId: string;
  toolUserId: string;
  linkedAt: string;
}

// ===========================================================================
// JWT Token Claims
// ===========================================================================

export interface ToolAccessJWTClaims {
  iss: string; // "1sub"
  aud: string; // tool_id
  sub: string; // onesub_user_id
  email: string;
  jti: string;
  iat: number;
  exp: number;
  nonce?: string;
}

// ===========================================================================
// Webhook Types
// ===========================================================================

export type WebhookEventType =
  | 'subscription.activated'
  | 'subscription.canceled'
  | 'subscription.updated'
  | 'purchase.completed'
  | 'user.credit_low'
  | 'user.credit_depleted'
  | 'tool.status_changed';

export interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  created: number;
  data: {
    oneSubUserId: string;
    planId?: string;
    productId?: string;
    status?: SubscriptionStatus;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    quantity?: number;
    creditsRemaining?: number;
    creditBalance?: number;
    threshold?: number;
    toolId?: string;
    toolStatus?: boolean;
    sessionExpiredAt?: string;
    checkoutId?: string;
    amount?: number;
    purchaseType?: string;
  };
}

// ===========================================================================
// Tool Credentials Metadata
// ===========================================================================

export interface ToolCredentialsMetadata {
  webhook_secret?: string;
  webhook_url?: string;
  redirect_uri?: string;
  allowed_origins?: string[];
  rate_limit?: number;
  custom_data?: Record<string, unknown>;
}

// ===========================================================================
// Error Types
// ===========================================================================

export interface APIError {
  error: string;
  message: string;
  details?: unknown;
}


