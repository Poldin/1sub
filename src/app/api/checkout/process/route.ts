import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentBalance, addCredits, subtractCredits } from '@/lib/credits-service';
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

    // Sensitive data removed from logs - use audit logs for security events

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

    // Sensitive data removed from logs

    // 2. Verify user ownership
    if (checkout.user_id !== authUser.id) {
      console.warn('[WARN][checkout/process] Auth user mismatch - unauthorized checkout access attempt');
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

    // 4. IDEMPOTENCY CHECK: Check if checkout is already completed
    const metadata = checkout.metadata as Record<string, unknown>;
    if (metadata?.status === 'completed') {
      // Return existing result (idempotent)
      return NextResponse.json(
        { 
          success: true,
          message: 'Checkout already completed',
          tool_url: metadata.tool_url,
          is_duplicate: true,
        },
        { status: 200 }
      );
    }

    // Check for idempotency key in metadata
    const idempotencyKey = metadata?.idempotency_key as string | undefined;

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

    // 6. Determine transaction reason based on checkout type
    let transactionReason = `Tool purchase: ${metadata.tool_name}`;
    if (checkoutType === 'tool_subscription') {
      transactionReason = `Subscription payment: ${metadata.tool_name} (${billingPeriod || 'monthly'})`;
    }

    // 7. ATOMIC OPERATION: Subtract credits from user using credit service
    // This automatically checks for sufficient balance and handles idempotency
    const userTransactionResult = await subtractCredits({
      userId: authUser.id,
      amount: creditCost,
      reason: transactionReason,
      idempotencyKey: idempotencyKey || `checkout-${checkout.id}-user`,
      checkoutId: checkout.id,
      toolId: metadata.tool_id as string,
      metadata: {
        tool_name: metadata.tool_name,
        tool_url: metadata.tool_url,
        checkout_type: checkoutType,
        selected_pricing: selected_pricing || null,
      },
    });

    if (!userTransactionResult.success) {
      console.error('User transaction failed:', userTransactionResult.error);
      return NextResponse.json(
        { 
          error: userTransactionResult.error || 'Failed to process payment',
          current_balance: userTransactionResult.balanceBefore,
          required: creditCost
        },
        { status: userTransactionResult.error === 'Insufficient credits' ? 400 : 500 }
      );
    }

    // Transaction success logged via audit system

    // 8. ATOMIC OPERATION: Add credits to vendor using credit service
    // This ensures atomicity and proper balance tracking
    let vendorTransactionWarning = null;
    let vendorTransactionResult = null;

    if (checkout.vendor_id) {
      vendorTransactionResult = await addCredits({
        userId: checkout.vendor_id,
        amount: creditCost,
        reason: `Tool sale: ${metadata.tool_name}`,
        idempotencyKey: idempotencyKey || `checkout-${checkout.id}-vendor`,
        checkoutId: checkout.id,
        toolId: metadata.tool_id as string,
        metadata: {
          buyer_id: authUser.id,
          tool_name: metadata.tool_name,
        },
      });

      if (!vendorTransactionResult.success) {
        console.error('CRITICAL: Vendor transaction creation failed:', {
          error: vendorTransactionResult.error,
          vendor_id: checkout.vendor_id,
          checkout_id: checkout.id,
          tool_id: metadata.tool_id,
          tool_name: metadata.tool_name,
          credit_cost: creditCost,
          buyer_id: authUser.id,
        });
        vendorTransactionWarning = 'Vendor earnings may not have been recorded. Please contact support.';
        
        // NOTE: In a traditional ACID database, we would rollback the user transaction here.
        // With Supabase, we log this as a critical error for manual intervention.
        // Future improvement: Implement a compensation table to track failed vendor transactions
      } else {
        console.log('[DEBUG][checkout/process] Vendor transaction successful', {
          transactionId: vendorTransactionResult.transactionId,
          balanceBefore: vendorTransactionResult.balanceBefore,
          balanceAfter: vendorTransactionResult.balanceAfter,
        });
      }
    } else {
      console.warn('Checkout processed without vendor_id:', {
        checkout_id: checkout.id,
        tool_id: metadata.tool_id,
        tool_name: metadata.tool_name,
      });
    }

    // 9. Create subscription record if this is a subscription checkout
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
        // NOTE: Credits have already been deducted, but subscription wasn't created
        // This requires manual intervention
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

    // 11. Update checkout status to completed (IDEMPOTENT)
    // Store idempotency key in metadata to prevent duplicate processing
    const updatedMetadata = {
      ...metadata,
      status: 'completed',
      completed_at: new Date().toISOString(),
      idempotency_key: idempotencyKey || `checkout-${checkout.id}`,
      user_transaction_id: userTransactionResult.transactionId,
      vendor_transaction_id: vendorTransactionResult?.transactionId,
    };

    const { error: updateError } = await supabase
      .from('checkouts')
      .update({
        metadata: updatedMetadata,
      })
      .eq('id', checkout.id);

    if (updateError) {
      console.error('Checkout update error:', updateError);
      // Don't fail the transaction if metadata update fails
      // The transaction has already been processed successfully
    }

    console.log('[DEBUG][checkout/process] Purchase complete', {
      checkoutId: checkout.id,
      authUserId: authUser.id,
      newBalance: userTransactionResult.balanceAfter,
      vendorId: checkout.vendor_id,
    });

    // 12. Return success
    return NextResponse.json({
      success: true,
      message: checkoutType === 'tool_subscription' 
        ? 'Subscription activated successfully' 
        : 'Purchase completed successfully',
      tool_url: metadata.tool_url,
      tool_access_token: toolAccessToken, // Include token in response
      new_balance: userTransactionResult.balanceAfter,
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
