import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    // 3. Check if checkout is already completed
    const metadata = checkout.metadata as Record<string, unknown>;
    if (metadata?.status === 'completed') {
      return NextResponse.json(
        { error: 'Checkout already completed', tool_url: metadata.tool_url },
        { status: 400 }
      );
    }

    // 4. Determine credit cost and checkout type from selected pricing
    let creditCost = checkout.credit_amount || 0;
    let checkoutType = checkout.type || 'tool_purchase';
    let billingPeriod = null;

    // If pricing options available and pricing selected, use that
    if (selected_pricing && metadata.pricing_options) {
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

        // Update checkout with selected option
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
    }

    // 5. Fetch user's current credit balance
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

    // Calculate current balance
    let currentBalance = 0;
    if (transactions && transactions.length > 0) {
      currentBalance = transactions.reduce((sum, transaction) => {
        const amount = transaction.credits_amount || 0;
        if (transaction.type === 'add') {
          return sum + amount;
        } else if (transaction.type === 'subtract') {
          return sum - amount;
        }
        return sum;
      }, 0);
    }

    // 6. Verify user has enough credits
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

    // 7. Determine transaction reason based on checkout type
    let transactionReason = `Tool purchase: ${metadata.tool_name}`;
    if (checkoutType === 'tool_subscription') {
      transactionReason = `Subscription payment: ${metadata.tool_name} (${billingPeriod || 'monthly'})`;
    }

    // 8. Create user transaction (spend credits)
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

    // 7. Create vendor transaction (earn credits) if vendor exists
    if (checkout.vendor_id) {
      // Fetch vendor's current balance
      const { data: vendorTransactions } = await supabase
        .from('credit_transactions')
        .select('credits_amount, type')
        .eq('user_id', checkout.vendor_id);

      let vendorBalance = 0;
      if (vendorTransactions && vendorTransactions.length > 0) {
        vendorBalance = vendorTransactions.reduce((sum, transaction) => {
          const amount = transaction.credits_amount || 0;
          if (transaction.type === 'add') {
            return sum + amount;
          } else if (transaction.type === 'subtract') {
            return sum - amount;
          }
          return sum;
        }, 0);
      }

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
        console.error('Vendor transaction error:', vendorTransactionError);
        // Note: User transaction already created, this is a critical issue
        // In production, this should be handled with proper transaction rollback
      }
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
          }
    }

    // 10. Update checkout status to completed
    const updatedMetadata = {
      ...metadata,
      status: 'completed',
      completed_at: new Date().toISOString(),
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

    // 11. Return success
    return NextResponse.json({
      success: true,
      message: checkoutType === 'tool_subscription' 
        ? 'Subscription activated successfully' 
        : 'Purchase completed successfully',
      tool_url: metadata.tool_url,
      new_balance: currentBalance - creditCost,
      is_subscription: checkoutType === 'tool_subscription',
      selected_pricing: selected_pricing || null,
    });

  } catch (error) {
    console.error('Checkout process error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

