/**
 * Stripe Checkout Session API
 * 
 * Creates a Stripe Checkout session for credit purchases.
 * Supports multiple credit packages (100, 500, 1000 credits).
 * 
 * Features:
 * - Secure session creation with metadata
 * - Automatic redirect URLs (success/cancel)
 * - Idempotency key generation for webhook handling
 * - User authentication required
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Credit packages with prices (in cents)
const CREDIT_PACKAGES = {
  100: { credits: 100, price: 1000, name: '100 Credits' }, // $10.00
  500: { credits: 500, price: 4500, name: '500 Credits' }, // $45.00 (10% discount)
  1000: { credits: 1000, price: 8000, name: '1000 Credits' }, // $80.00 (20% discount)
} as const;

type PackageKey = keyof typeof CREDIT_PACKAGES;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { packageKey } = body as { packageKey: string };

    // Validate package key
    if (!packageKey || !(packageKey in CREDIT_PACKAGES)) {
      return NextResponse.json(
        { 
          error: 'Invalid package',
          available_packages: Object.keys(CREDIT_PACKAGES)
        },
        { status: 400 }
      );
    }

    const selectedPackage = CREDIT_PACKAGES[packageKey as unknown as PackageKey];

    // Generate idempotency key for this session
    const idempotencyKey = `stripe-${authUser.id}-${Date.now()}`;

    // Get user profile for customer info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', authUser.id)
      .single();

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: selectedPackage.name,
              description: `Purchase ${selectedPackage.credits} credits for the 1sub platform`,
              images: ['https://yourdomain.com/logo.png'], // Update with your logo URL
            },
            unit_amount: selectedPackage.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/buy-credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/buy-credits?canceled=true`,
      customer_email: profile?.email || authUser.email,
      client_reference_id: authUser.id,
      metadata: {
        userId: authUser.id,
        userEmail: authUser.email || '',
        creditAmount: selectedPackage.credits.toString(),
        packageKey,
        idempotencyKey,
      },
    });

    console.log('[Stripe] Checkout session created:', {
      sessionId: session.id,
      userId: authUser.id,
      credits: selectedPackage.credits,
      amount: selectedPackage.price / 100, // Convert cents to dollars
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

