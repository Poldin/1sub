import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const FROM_EMAIL = process.env.FROM_EMAIL || 'security@1sub.io';

/**
 * Error codes for structured error responses
 */
enum OTPErrorCode {
  INVALID_API_KEY = 'INVALID_API_KEY',
  UNVERIFIED_SENDER = 'UNVERIFIED_SENDER',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_RECIPIENT = 'INVALID_RECIPIENT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Validate email configuration
 */
function validateEmailConfig(): { valid: boolean; error?: string; code?: OTPErrorCode } {
  // Check if API key is present
  if (!process.env.RESEND_API_KEY) {
    return {
      valid: false,
      error: 'Email service not configured. Please contact support.',
      code: OTPErrorCode.CONFIGURATION_ERROR,
    };
  }

  // Validate API key format (Resend keys start with 're_')
  if (!process.env.RESEND_API_KEY.startsWith('re_')) {
    console.error('Invalid RESEND_API_KEY format:', {
      apiKeyPrefix: process.env.RESEND_API_KEY.substring(0, 3),
      expected: 're_',
    });
    return {
      valid: false,
      error: 'Email service misconfigured. Please contact support.',
      code: OTPErrorCode.CONFIGURATION_ERROR,
    };
  }

  // Validate FROM_EMAIL format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(FROM_EMAIL)) {
    console.error('Invalid FROM_EMAIL format:', FROM_EMAIL);
    return {
      valid: false,
      error: 'Email service misconfigured. Please contact support.',
      code: OTPErrorCode.CONFIGURATION_ERROR,
    };
  }

  return { valid: true };
}

/**
 * Categorize Resend API errors
 */
function categorizeResendError(error: any): { 
  message: string; 
  code: OTPErrorCode;
  userMessage: string;
} {
  // Log full error details for debugging
  console.error('Resend API error details:', {
    error,
    message: error?.message,
    name: error?.name,
    statusCode: error?.statusCode,
    type: error?.type,
  });

  // Invalid API key
  if (
    error?.message?.toLowerCase().includes('api key') ||
    error?.message?.toLowerCase().includes('unauthorized') ||
    error?.message?.toLowerCase().includes('authentication') ||
    error?.statusCode === 401
  ) {
    return {
      message: 'Invalid Resend API key',
      code: OTPErrorCode.INVALID_API_KEY,
      userMessage: 'Email service authentication failed. Please contact support.',
    };
  }

  // Unverified sender domain/email
  if (
    error?.message?.toLowerCase().includes('verify') ||
    error?.message?.toLowerCase().includes('domain') ||
    error?.message?.toLowerCase().includes('sender') ||
    error?.statusCode === 403
  ) {
    return {
      message: 'Sender email or domain not verified with Resend',
      code: OTPErrorCode.UNVERIFIED_SENDER,
      userMessage: 'Email service not properly configured. Please contact support.',
    };
  }

  // Rate limiting
  if (
    error?.message?.toLowerCase().includes('rate limit') ||
    error?.message?.toLowerCase().includes('too many requests') ||
    error?.statusCode === 429
  ) {
    return {
      message: 'Resend API rate limit exceeded',
      code: OTPErrorCode.RATE_LIMIT,
      userMessage: 'Too many verification requests. Please try again in a few minutes.',
    };
  }

  // Invalid recipient email
  if (
    error?.message?.toLowerCase().includes('invalid email') ||
    error?.message?.toLowerCase().includes('recipient') ||
    error?.statusCode === 422
  ) {
    return {
      message: 'Invalid recipient email address',
      code: OTPErrorCode.INVALID_RECIPIENT,
      userMessage: 'Your email address appears to be invalid. Please contact support.',
    };
  }

  // Network/timeout errors
  if (
    error?.message?.toLowerCase().includes('network') ||
    error?.message?.toLowerCase().includes('timeout') ||
    error?.message?.toLowerCase().includes('econnrefused') ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ETIMEDOUT'
  ) {
    return {
      message: 'Network error connecting to email service',
      code: OTPErrorCode.NETWORK_ERROR,
      userMessage: 'Unable to send email due to network error. Please try again.',
    };
  }

  // Unknown error
  return {
    message: error?.message || 'Unknown Resend API error',
    code: OTPErrorCode.UNKNOWN_ERROR,
    userMessage: 'Failed to send verification email. Please try again or contact support.',
  };
}

// Rate limiting configuration
const OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_REQUESTS_PER_WINDOW = 3;
const OTP_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Check rate limiting for OTP requests
 */
function checkRateLimit(metadata: Record<string, unknown>): {
  allowed: boolean;
  remainingRequests: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const otpRequests = (metadata?.otp_requests as number[]) || [];

  // Filter requests within the rate limit window
  const recentRequests = otpRequests.filter(
    (timestamp) => now - timestamp < OTP_RATE_LIMIT_WINDOW_MS
  );

  if (recentRequests.length >= OTP_MAX_REQUESTS_PER_WINDOW) {
    // Calculate when the oldest request will expire
    const oldestRequest = Math.min(...recentRequests);
    const retryAfterMs = OTP_RATE_LIMIT_WINDOW_MS - (now - oldestRequest);
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    return {
      allowed: false,
      remainingRequests: 0,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remainingRequests: OTP_MAX_REQUESTS_PER_WINDOW - recentRequests.length - 1,
  };
}

/**
 * Generate a 6-digit OTP and send it via email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkout_id } = body;

    if (!checkout_id) {
      return NextResponse.json(
        { error: 'Checkout ID is required', code: 'MISSING_CHECKOUT_ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Fetch checkout record
    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .select('*')
      .eq('id', checkout_id)
      .single();

    if (checkoutError || !checkout) {
      return NextResponse.json(
        { error: 'Checkout not found', code: 'CHECKOUT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify user ownership
    if (checkout.user_id !== authUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized to process this checkout', code: 'UNAUTHORIZED' },
        { status: 403 }
      );
    }

    // Check if checkout is already completed
    const metadata = (checkout.metadata as Record<string, unknown>) || {};
    if (metadata?.status === 'completed') {
      return NextResponse.json(
        { error: 'Checkout already completed', code: 'CHECKOUT_COMPLETED' },
        { status: 400 }
      );
    }

    // Check rate limiting
    const rateLimitCheck = checkRateLimit(metadata);
    if (!rateLimitCheck.allowed) {
      console.warn('OTP rate limit exceeded:', {
        checkoutId: checkout_id,
        userId: authUser.id,
        retryAfterSeconds: rateLimitCheck.retryAfterSeconds,
      });
      return NextResponse.json(
        {
          error: `Too many OTP requests. Please try again in ${rateLimitCheck.retryAfterSeconds} seconds.`,
          code: 'OTP_RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: rateLimitCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // Get user email
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.email) {
      return NextResponse.json(
        { error: 'User email not found', code: 'USER_EMAIL_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Validate email configuration before proceeding
    const configValidation = validateEmailConfig();
    if (!configValidation.valid) {
      console.error('Email configuration validation failed:', {
        error: configValidation.error,
        code: configValidation.code,
        fromEmail: FROM_EMAIL,
        hasApiKey: !!process.env.RESEND_API_KEY,
      });

      // In development, allow bypassing email send for testing
      if (process.env.NODE_ENV === 'development') {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const now = Date.now();

        // Update OTP requests for rate limiting and store otp_created_at
        const existingRequests = (metadata?.otp_requests as number[]) || [];
        const recentRequests = existingRequests.filter(
          (timestamp) => now - timestamp < OTP_RATE_LIMIT_WINDOW_MS
        );

        // Save OTP to checkout record with timestamp and rate limit tracking
        const { error: updateError } = await supabase
          .from('checkouts')
          .update({
            otp,
            metadata: {
              ...metadata,
              otp_created_at: now,
              otp_requests: [...recentRequests, now],
            },
          })
          .eq('id', checkout_id);

        if (updateError) {
          console.error('Error saving OTP:', updateError);
          return NextResponse.json(
            { error: 'Failed to save OTP', code: 'DATABASE_ERROR' },
            { status: 500 }
          );
        }

        console.warn('Development mode: OTP generated without email send:', { otp });
        return NextResponse.json({
          success: true,
          message: 'OTP generated (email not configured)',
          otp, // Only in development
        });
      }

      return NextResponse.json(
        {
          error: configValidation.error,
          code: configValidation.code,
        },
        { status: 503 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();

    // Update OTP requests for rate limiting
    const existingRequests = (metadata?.otp_requests as number[]) || [];
    const recentRequests = existingRequests.filter(
      (timestamp) => now - timestamp < OTP_RATE_LIMIT_WINDOW_MS
    );

    // Save OTP to checkout record with timestamp and rate limit tracking
    const { error: updateError } = await supabase
      .from('checkouts')
      .update({
        otp,
        metadata: {
          ...metadata,
          otp_created_at: now,
          otp_requests: [...recentRequests, now],
        },
      })
      .eq('id', checkout_id);

    if (updateError) {
      console.error('Error saving OTP to database:', {
        error: updateError,
        checkoutId: checkout_id,
        userId: authUser.id,
      });
      return NextResponse.json(
        { error: 'Failed to save OTP', code: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }

    // Initialize Resend client with validated API key
    const resend = new Resend(process.env.RESEND_API_KEY);

    const toolName = (metadata.tool_name as string) || 'tool';

    // Calculate credit amount from metadata (same logic as frontend)
    const getCreditAmount = (): number => {
      const selectedPricing = metadata.selected_pricing as string | undefined;

      // Check products array (new structure)
      const products = metadata.products as Array<{
        id: string;
        pricing_model: {
          one_time?: { enabled: boolean; price?: number; min_price?: number };
          subscription?: { enabled: boolean; price?: number };
          usage_based?: { enabled: boolean; price_per_unit?: number };
        };
      }> | undefined;

      if (products && products.length > 0 && selectedPricing) {
        const product = products.find(p => p.id === selectedPricing);
        if (product) {
          const pm = product.pricing_model;
          if (pm.one_time?.enabled) {
            if (pm.one_time.price) return pm.one_time.price;
            if (pm.one_time.min_price) return pm.one_time.min_price;
          }
          if (pm.subscription?.enabled && pm.subscription.price) return pm.subscription.price;
          if (pm.usage_based?.enabled && pm.usage_based.price_per_unit) return pm.usage_based.price_per_unit;
        }
      }

      // Check pricing_options (old structure)
      const pricingOptions = metadata.pricing_options as Record<string, { enabled: boolean; price: number }> | undefined;
      if (pricingOptions && selectedPricing) {
        const option = pricingOptions[selectedPricing];
        if (option?.enabled && option.price) {
          return option.price;
        }
      }

      // Fallback to checkout.credit_amount
      return checkout.credit_amount || 0;
    };

    const creditAmount = getCreditAmount();

    console.log('Attempting to send OTP email via Resend:', {
      to: user.email,
      from: FROM_EMAIL,
      checkoutId: checkout_id,
      userId: authUser.id,
      toolName,
      creditAmount,
    });

    // Send OTP via email with comprehensive error handling
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [user.email],
        subject: 'Your checkout verification code',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Checkout Verification Code</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #3ecf8e 0%, #2dd4bf 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Verification Code</h1>
              </div>
              
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-top: 0;">Hi there,</p>
                
                <p style="font-size: 16px;">You're completing a purchase for <strong>${toolName}</strong> (${creditAmount} credits).</p>
                
                <p style="font-size: 16px;">Please use the following verification code to confirm your payment:</p>
                
                <div style="background: #f3f4f6; border: 2px dashed #3ecf8e; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                  <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #3ecf8e; font-family: monospace;">
                    ${otp}
                  </div>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                  This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
                </p>
                
                <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                  Best regards,<br>
                  The 1sub Team
                </p>
              </div>
            </body>
          </html>
        `,
      });

      if (emailError) {
        // Categorize and handle the error appropriately
        const errorInfo = categorizeResendError(emailError);
        
        console.error('Resend API error when sending OTP:', {
          errorInfo,
          originalError: emailError,
          to: user.email,
          from: FROM_EMAIL,
          checkoutId: checkout_id,
          userId: authUser.id,
        });

        // Return user-friendly error message
        return NextResponse.json(
          { 
            error: errorInfo.userMessage,
            code: errorInfo.code,
            // Include detailed error in development
            ...(process.env.NODE_ENV === 'development' && {
              details: errorInfo.message,
            }),
          },
          { status: 500 }
        );
      }

      console.log('OTP email sent successfully via Resend:', {
        emailId: emailData?.id,
        to: user.email,
        from: FROM_EMAIL,
        checkoutId: checkout_id,
        userId: authUser.id,
      });

      return NextResponse.json({
        success: true,
        message: 'OTP sent successfully',
      });

    } catch (emailSendError) {
      // Handle unexpected errors during email send
      const errorInfo = categorizeResendError(emailSendError);
      
      console.error('Unexpected error during OTP email send:', {
        errorInfo,
        error: emailSendError,
        to: user.email,
        from: FROM_EMAIL,
        checkoutId: checkout_id,
        userId: authUser.id,
      });

      return NextResponse.json(
        { 
          error: errorInfo.userMessage,
          code: errorInfo.code,
          // Include detailed error in development
          ...(process.env.NODE_ENV === 'development' && {
            details: errorInfo.message,
          }),
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Generate OTP error (unexpected):', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        // Include detailed error in development
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}

