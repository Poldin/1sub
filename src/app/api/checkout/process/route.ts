import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { calculateCreditsFromTransactions } from '@/lib/credits';
import { generateToolAccessToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkout_id, selected_pricing } = body;

    if (!checkout_id) {
      return NextResponse.json(
        { error: 'Checkout ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 1. Fetch checkout record
    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .select('*')
      .eq('id', checkout_id)
      .single();

    if (checkoutError || !checkout) {
      return NextResponse.json(
        { error: 'Checkout not found' },
        { status: 404 }
      );
    }

    // 2. Verify user ownership
    if (checkout.user_id !== authUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized to process this checkout' },
        { status: 403 }
      );
    }

    // 3. Prevent self-purchase (user cannot buy their own tools)
    if (checkout.vendor_id === authUser.id) {
      return NextResponse.json(
        { error: 'You cannot purchase your own tools' },
        { status: 400 }
      );
    }

    // 4. Check if checkout is already completed
    const metadata = checkout.metadata as Record<string, unknown>;
    if (metadata?.status === 'completed') {
      return NextResponse.json(
        { error: 'Checkout already completed', tool_url: metadata.tool_url },
        { status: 400 }
      );
    }

    // 5. Determine credit cost and checkout type from selected pricing
    let creditCost = checkout.credit_amount || 0;
    let checkoutType = checkout.type || 'tool_purchase';
    let billingPeriod = null;

    // Handle products (new structure) - priority over pricing_options
    if (selected_pricing && metadata.products && Array.isArray(metadata.products)) {
      const products = metadata.products as Array<{
        id: string;
        name: string;
        pricing_model: {
          one_time?: { enabled: boolean; type?: string; price?: number; min_price?: number; max_price?: number };
          subscription?: { enabled: boolean; price: number; interval: 'day' | 'week' | 'month' | 'year'; trial_days?: number };
          usage_based?: { enabled: boolean; price_per_unit: number; unit_name: string; minimum_units?: number };
        };
      }>;
      
      const selectedProduct = products.find(p => p.id === selected_pricing);
      if (selectedProduct) {
        const pm = selectedProduct.pricing_model;
        
        // Determine price and checkout type from product pricing model
        if (pm.one_time?.enabled) {
          if (pm.one_time.price) {
            creditCost = pm.one_time.price;
            checkoutType = 'tool_purchase';
          } else if (pm.one_time.min_price) {
            // For range pricing, use min_price (or could require user to specify)
            creditCost = pm.one_time.min_price;
            checkoutType = 'tool_purchase';
          }
        } else if (pm.subscription?.enabled && pm.subscription.price) {
          creditCost = pm.subscription.price;
          checkoutType = 'tool_subscription';
          billingPeriod = pm.subscription.interval === 'year' ? 'yearly' : 'monthly';
        } else if (pm.usage_based?.enabled && pm.usage_based.price_per_unit) {
          creditCost = pm.usage_based.price_per_unit;
          checkoutType = 'tool_purchase'; // Usage-based is typically one-time per unit
        }
      }
    }
    // Handle pricing_options (old structure) - fallback if products not used
    else if (selected_pricing && metadata.pricing_options) {
      const pricingOptions = metadata.pricing_options as Record<string, { enabled: boolean; price: number; description?: string }>;
      const pricingOption = pricingOptions[selected_pricing];
      if (pricingOption && pricingOption.enabled) {
        creditCost = pricingOption.price;
        
        // Determine checkout type
        if (selected_pricing === 'one_time') {
          checkoutType = 'tool_purchase';
        } else if (selected_pricing === 'subscription_monthly') {
          checkoutType = 'tool_subscription';
          billingPeriod = 'monthly';
        } else if (selected_pricing === 'subscription_yearly') {
          checkoutType = 'tool_subscription';
          billingPeriod = 'yearly';
        }
      }
    }

    // Validate that we have a valid credit cost
    if (creditCost <= 0) {
      return NextResponse.json(
        { 
          error: 'Invalid pricing configuration. Credit cost must be greater than 0.',
          selected_pricing,
          has_products: !!(metadata.products && Array.isArray(metadata.products)),
          has_pricing_options: !!metadata.pricing_options,
          checkout_credit_amount: checkout.credit_amount
        },
        { status: 400 }
      );
    }

    // Update checkout with selected option (if products or pricing_options were used)
    if (selected_pricing && (metadata.products || metadata.pricing_options)) {
      await supabase.from('checkouts').update({
        credit_amount: creditCost,
        type: checkoutType,
        metadata: {
          ...metadata,
          selected_pricing,
          billing_period: billingPeriod,
        }
      }).eq('id', checkout_id);
    }

    // 6. Fetch user's current credit balance
    const { data: transactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('credits_amount, type')
      .eq('user_id', authUser.id);

    if (transactionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch user balance' },
        { status: 500 }
      );
    }

    // Calculate current balance using centralized utility
    const currentBalance = calculateCreditsFromTransactions(transactions || []);

    // 7. Verify user has enough credits
    if (currentBalance < creditCost) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          current_balance: currentBalance,
          required: creditCost
        },
        { status: 400 }
      );
    }

    // 8. Determine transaction reason based on checkout type
    let transactionReason = `Tool purchase: ${metadata.tool_name}`;
    if (checkoutType === 'tool_subscription') {
      transactionReason = `Subscription payment: ${metadata.tool_name} (${billingPeriod || 'monthly'})`;
    }

    // 9. Create user transaction (spend credits)
    const { error: userTransactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: authUser.id,
        checkout_id: checkout.id,
        tool_id: metadata.tool_id,
        credits_amount: creditCost,
        type: 'subtract',
        reason: transactionReason,
        balance_after: currentBalance - creditCost,
        metadata: {
          tool_name: metadata.tool_name,
          tool_url: metadata.tool_url,
          checkout_type: checkoutType,
          selected_pricing: selected_pricing || null,
        },
      });

    if (userTransactionError) {
      console.error('User transaction error:', userTransactionError);
      return NextResponse.json(
        { error: 'Failed to process payment' },
        { status: 500 }
      );
    }

    // 10. Create vendor transaction (earn credits) if vendor exists
    let vendorTransactionWarning = null;
    if (checkout.vendor_id) {
      // Fetch vendor's current balance
      const { data: vendorTransactions } = await supabase
        .from('credit_transactions')
        .select('credits_amount, type')
        .eq('user_id', checkout.vendor_id);

      // Calculate vendor balance using centralized utility
      const vendorBalance = calculateCreditsFromTransactions(vendorTransactions || []);

      const { error: vendorTransactionError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: checkout.vendor_id,
          checkout_id: checkout.id,
          tool_id: metadata.tool_id,
          credits_amount: creditCost,
          type: 'add',
          reason: `Tool sale: ${metadata.tool_name}`,
          balance_after: vendorBalance + creditCost,
          metadata: {
            buyer_id: authUser.id,
            tool_name: metadata.tool_name,
          },
        });

      if (vendorTransactionError) {
        console.error('CRITICAL: Vendor transaction creation failed:', {
          error: vendorTransactionError,
          vendor_id: checkout.vendor_id,
          checkout_id: checkout.id,
          tool_id: metadata.tool_id,
          tool_name: metadata.tool_name,
          credit_cost: creditCost,
          buyer_id: authUser.id,
        });
        vendorTransactionWarning = 'Vendor earnings may not have been recorded. Please contact support.';
        // Note: User transaction already created, this is a critical issue
        // In production, this should be handled with proper transaction rollback
      }
    } else {
      console.warn('Checkout processed without vendor_id:', {
        checkout_id: checkout.id,
        tool_id: metadata.tool_id,
        tool_name: metadata.tool_name,
      });
    }

    // 11. Create subscription record if this is a subscription checkout
    if (checkoutType === 'tool_subscription' && billingPeriod) {
      // Calculate next billing date
      const nextBillingDate = new Date();
      if (billingPeriod === 'monthly') {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      } else if (billingPeriod === 'yearly') {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      }

      const { error: subError } = await supabase
        .from('tool_subscriptions')
        .insert({
          user_id: authUser.id,
          tool_id: metadata.tool_id,
          vendor_id: checkout.vendor_id,
          status: 'active',
          credit_price: creditCost,
          billing_period: billingPeriod,
          started_at: new Date().toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          last_billing_date: new Date().toISOString(),
          metadata: {
            tool_name: metadata.tool_name,
            initial_checkout_id: checkout.id,
            selected_pricing,
          },
        });

          if (subError) {
            console.error('CRITICAL: Failed to create subscription:', subError);
            console.error('Subscription data:', {
              user_id: authUser.id,
              tool_id: metadata.tool_id,
              vendor_id: checkout.vendor_id,
              credit_price: creditCost,
              billing_period: billingPeriod,
            });
            
            // TODO: Store in failed_subscriptions table for manual review
          }
    }

    // 10. Generate JWT token for tool access
    let toolAccessToken: string | null = null;
    try {
      toolAccessToken = generateToolAccessToken(
        authUser.id,
        metadata.tool_id as string,
        checkout.id
      );
    } catch (error) {
      console.error('Error generating tool access token:', error);
      // Don't fail the checkout if token generation fails
    }

    // 11. Update checkout status to completed
    // FIX: Don't store JWT token in database (security issue)
    // Tokens are short-lived and should only be transmitted, not persisted
    const updatedMetadata = {
      ...metadata,
      status: 'completed',
      completed_at: new Date().toISOString(),
      // Removed: tool_access_token storage (security fix)
    };

    const { error: updateError } = await supabase
      .from('checkouts')
      .update({
        metadata: updatedMetadata,
      })
      .eq('id', checkout.id);

    if (updateError) {
      console.error('Checkout update error:', updateError);
    }

    // 12. Return success
    return NextResponse.json({
      success: true,
      message: checkoutType === 'tool_subscription' 
        ? 'Subscription activated successfully' 
        : 'Purchase completed successfully',
      tool_url: metadata.tool_url,
      tool_access_token: toolAccessToken, // Include token in response
      new_balance: currentBalance - creditCost,
      is_subscription: checkoutType === 'tool_subscription',
      selected_pricing: selected_pricing || null,
      vendor_warning: vendorTransactionWarning || undefined,
    });

  } catch (error) {
    console.error('Checkout process error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

