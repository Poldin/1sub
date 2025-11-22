import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentBalance, addCredits, subtractCredits } from '@/lib/credits-service';
import { generateToolAccessToken } from '@/lib/jwt';
import { notifySubscriptionActivated } from '@/lib/tool-webhooks';

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
        is_custom_plan?: boolean;
        pricing_model: {
          one_time?: { enabled: boolean; type?: string; price?: number; min_price?: number; max_price?: number };
          subscription?: { enabled: boolean; price: number; interval: 'day' | 'week' | 'month' | 'year'; trial_days?: number };
          usage_based?: { enabled: boolean; price_per_unit: number; unit_name: string; minimum_units?: number };
          custom_plan?: { enabled: boolean; contact_email?: string };
        };
      }>;
      
      const selectedProduct = products.find(p => p.id === selected_pricing);
      if (selectedProduct) {
        // Check if this is a custom plan product
        const isCustomPlan = selectedProduct.is_custom_plan || selectedProduct.pricing_model.custom_plan?.enabled;
        if (isCustomPlan) {
          return NextResponse.json(
            { error: 'This product requires custom pricing. Please contact the vendor directly.' },
            { status: 400 }
          );
        }

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

    // 6.5. Pre-check balance for better error messages (non-blocking, RPC will do final check)
    const preCheckBalance = await getCurrentBalance(authUser.id);
    console.log('[DEBUG][checkout/process] Pre-check balance:', {
      userId: authUser.id,
      balance: preCheckBalance,
      creditCost,
      hasEnough: preCheckBalance >= creditCost
    });

    // 7. ATOMIC OPERATION: Subtract credits from user using RPC with row-level locking
    // This prevents race conditions and ensures atomic balance checks and deductions
    const { data: consumeResult, error: consumeError } = await supabase
      .rpc('consume_credits', {
        p_user_id: authUser.id,
        p_amount: creditCost,
        p_reason: transactionReason,
        p_idempotency_key: idempotencyKey || `checkout-${checkout.id}-user`,
        p_tool_id: metadata.tool_id as string,
        p_metadata: {
          tool_name: metadata.tool_name,
          tool_url: metadata.tool_url,
          checkout_type: checkoutType,
          selected_pricing: selected_pricing || null,
          checkout_id: checkout.id,
        }
      });

    if (consumeError) {
      console.error('Credit consumption RPC error:', consumeError);
      return NextResponse.json(
        { 
          error: 'Failed to process payment',
          details: consumeError.message
        },
        { status: 500 }
      );
    }

    // Check if result is null or undefined
    if (!consumeResult) {
      console.error('Credit consumption RPC returned null/undefined result', {
        userId: authUser.id,
        creditCost,
        checkoutId: checkout.id
      });
      return NextResponse.json(
        { 
          error: 'Failed to process payment',
          details: 'No result returned from credit consumption service'
        },
        { status: 500 }
      );
    }

    // Parse RPC result - handle both direct object and JSONB string
    let userTransactionResult: {
      success: boolean;
      transaction_id?: string;
      balance_before: number;
      balance_after: number;
      is_duplicate?: boolean;
      error?: string;
      required?: number;
    };

    // If result is a string (JSONB), parse it
    if (typeof consumeResult === 'string') {
      try {
        userTransactionResult = JSON.parse(consumeResult);
      } catch (parseError) {
        console.error('Failed to parse RPC result as JSON:', parseError, {
          rawResult: consumeResult,
          userId: authUser.id,
          creditCost
        });
        return NextResponse.json(
          { 
            error: 'Failed to process payment',
            details: 'Invalid response format from credit service'
          },
          { status: 500 }
        );
      }
    } else {
      userTransactionResult = consumeResult as typeof userTransactionResult;
    }

    // Log the result for debugging
    console.log('[DEBUG][checkout/process] Credit consumption result:', {
      success: userTransactionResult.success,
      balance_before: userTransactionResult.balance_before,
      balance_after: userTransactionResult.balance_after,
      error: userTransactionResult.error,
      required: userTransactionResult.required,
      creditCost,
      userId: authUser.id
    });

    if (!userTransactionResult.success) {
      console.error('User transaction failed:', {
        error: userTransactionResult.error,
        balance_before: userTransactionResult.balance_before,
        required: userTransactionResult.required || creditCost,
        creditCost,
        userId: authUser.id,
        checkoutId: checkout.id,
        preCheckBalance
      });
      
      // Calculate shortfall for better error messaging
      const shortfall = userTransactionResult.error === 'Insufficient credits' 
        ? (userTransactionResult.required || creditCost) - userTransactionResult.balance_before
        : 0;
      
      // If there's a discrepancy between pre-check and RPC balance, log it
      if (preCheckBalance !== undefined && preCheckBalance !== userTransactionResult.balance_before) {
        console.warn('[WARN][checkout/process] Balance discrepancy detected:', {
          preCheckBalance,
          rpcBalance: userTransactionResult.balance_before,
          difference: preCheckBalance - userTransactionResult.balance_before,
          userId: authUser.id
        });
      }
      
      return NextResponse.json(
        { 
          error: userTransactionResult.error || 'Failed to process payment',
          current_balance: userTransactionResult.balance_before,
          required: creditCost,
          shortfall: shortfall > 0 ? shortfall : undefined,
          pre_check_balance: preCheckBalance !== undefined ? preCheckBalance : undefined
        },
        { status: userTransactionResult.error === 'Insufficient credits' ? 400 : 500 }
      );
    }

    // Map RPC result to expected format for backward compatibility
    const mappedUserResult = {
      success: true,
      transactionId: userTransactionResult.transaction_id,
      balanceBefore: userTransactionResult.balance_before,
      balanceAfter: userTransactionResult.balance_after,
    };

    // Transaction success logged via audit system
    // Use mapped result for compatibility with rest of the code
    const userTransactionResultCompat = mappedUserResult;

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

      // Map billingPeriod to period format (monthly/yearly -> monthly/yearly)
      const period = billingPeriod === 'yearly' ? 'yearly' : 'monthly';
      
      const { data: createdSub, error: subError } = await supabase
        .from('tool_subscriptions')
        .insert({
          user_id: authUser.id,
          tool_id: metadata.tool_id as string,
          checkout_id: checkout.id,
          status: 'active',
          credits_per_period: creditCost,
          period: period,
          next_billing_date: nextBillingDate.toISOString(),
          last_billing_date: new Date().toISOString(),
          metadata: {
            tool_name: metadata.tool_name,
            vendor_id: checkout.vendor_id,
            initial_checkout_id: checkout.id,
            selected_pricing,
          },
        })
        .select()
        .single();

      if (subError) {
        console.error('CRITICAL: Failed to create subscription:', {
          error: subError,
          message: subError.message,
          details: subError.details,
          hint: subError.hint,
          code: subError.code,
        });
        console.error('Subscription data that failed:', {
          user_id: authUser.id,
          tool_id: metadata.tool_id,
          vendor_id: checkout.vendor_id,
          credits_per_period: creditCost,
          period: billingPeriod,
          checkout_id: checkout.id,
        });
        
        // TODO: Store in failed_subscriptions table for manual review
        // NOTE: Credits have already been deducted, but subscription wasn't created
        // This requires manual intervention
      } else {
        console.log('[DEBUG][checkout/process] Subscription created successfully:', {
          subscriptionId: createdSub?.id,
          userId: authUser.id,
          toolId: metadata.tool_id,
          status: createdSub?.status,
        });
        // Send webhook notification for subscription activation
        try {
          const creditsRemaining = userTransactionResultCompat.balanceAfter;
          await notifySubscriptionActivated(
            metadata.tool_id as string,
            authUser.id,
            billingPeriod,
            nextBillingDate.toISOString(),
            creditsRemaining
          );
        } catch (webhookError) {
          // Don't fail the checkout if webhook fails
          console.error('[Webhook] Failed to send subscription.activated webhook:', webhookError);
        }
      }
    }

    // 10. Generate JWT tokens for tool access (both access and refresh)
    let toolAccessToken: string | null = null;
    let refreshToken: string | null = null;
    let accessTokenExpiresAt: string | null = null;
    let refreshTokenExpiresAt: string | null = null;
    
    try {
      const { generateTokenPair } = await import('@/lib/token-refresh');
      const tokens = generateTokenPair(
        authUser.id,
        metadata.tool_id as string,
        checkout.id
      );
      
      toolAccessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
      accessTokenExpiresAt = tokens.accessTokenExpiresAt;
      refreshTokenExpiresAt = tokens.refreshTokenExpiresAt;
    } catch (error) {
      console.error('Error generating tool access tokens:', error);
      // Don't fail the checkout if token generation fails
    }

    // 11. Update checkout status to completed (IDEMPOTENT)
    // Store idempotency key in metadata to prevent duplicate processing
    const updatedMetadata = {
      ...metadata,
      status: 'completed',
      completed_at: new Date().toISOString(),
      idempotency_key: idempotencyKey || `checkout-${checkout.id}`,
      user_transaction_id: userTransactionResultCompat.transactionId,
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
      newBalance: userTransactionResultCompat.balanceAfter,
      vendorId: checkout.vendor_id,
    });

    // 12. Return success with both tokens
    return NextResponse.json({
      success: true,
      message: checkoutType === 'tool_subscription' 
        ? 'Subscription activated successfully' 
        : 'Purchase completed successfully',
      tool_url: metadata.tool_url,
      tool_access_token: toolAccessToken, // Include access token in response
      refresh_token: refreshToken, // Include refresh token for session renewal
      access_token_expires_at: accessTokenExpiresAt,
      refresh_token_expires_at: refreshTokenExpiresAt,
      new_balance: userTransactionResultCompat.balanceAfter,
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
