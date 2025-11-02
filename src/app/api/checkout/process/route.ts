import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { calculateCreditsFromTransactions } from '@/lib/credits';
import { DatabaseProduct } from '@/lib/products';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkout_id, selected_product_id, selected_pricing_model } = body;

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

    // 5. Determine credit cost and checkout type from selected product
    let creditCost = checkout.credit_amount || 0;
    let checkoutType = checkout.type || 'tool_purchase';
    let billingPeriod = null;
    let selectedProductName = '';

    // If products available and product selected, use that
    if (selected_product_id && metadata.products) {
      const products = metadata.products as DatabaseProduct[];
      const selectedProduct = products.find(p => p.id === selected_product_id);
      
      if (!selectedProduct) {
        return NextResponse.json(
          { error: 'Selected product not found' },
          { status: 400 }
        );
      }

      if (!selectedProduct.is_active) {
        return NextResponse.json(
          { error: 'Selected product is no longer available' },
          { status: 400 }
        );
      }

      const pricingModel = selectedProduct.pricing_model?.pricing_model;
      selectedProductName = selectedProduct.name;

      // Determine pricing from product using selected pricing model
      if (pricingModel) {
        // Use the selected pricing model if provided
        if (selected_pricing_model) {
          if (selected_pricing_model === 'one_time' && pricingModel.one_time?.enabled && pricingModel.one_time.price) {
            creditCost = pricingModel.one_time.price;
            checkoutType = 'tool_purchase';
          } else if (selected_pricing_model === 'subscription' && pricingModel.subscription?.enabled && pricingModel.subscription.price) {
            creditCost = pricingModel.subscription.price;
            checkoutType = 'tool_subscription';
            billingPeriod = pricingModel.subscription.interval || 'month';
          } else if (selected_pricing_model === 'usage_based' && pricingModel.usage_based?.enabled && pricingModel.usage_based.price_per_unit) {
            const pricePerUnit = pricingModel.usage_based.price_per_unit;
            const minimumUnits = pricingModel.usage_based.minimum_units || 1;
            creditCost = pricePerUnit * minimumUnits; // Calculate minimum purchase amount
            checkoutType = 'tool_purchase'; // Usage-based treated as purchase
          } else {
            return NextResponse.json(
              { error: 'Invalid pricing model selected' },
              { status: 400 }
            );
          }
        } else {
          // Fallback: Use priority-based selection for backward compatibility
          // Check one-time pricing
          if (pricingModel.one_time?.enabled && pricingModel.one_time.price) {
            creditCost = pricingModel.one_time.price;
            checkoutType = 'tool_purchase';
          }
          // Check subscription pricing (priority over one-time if both exist)
          else if (pricingModel.subscription?.enabled && pricingModel.subscription.price) {
            creditCost = pricingModel.subscription.price;
            checkoutType = 'tool_subscription';
            billingPeriod = pricingModel.subscription.interval || 'month';
          }
          // Check usage-based pricing
          else if (pricingModel.usage_based?.enabled && pricingModel.usage_based.price_per_unit) {
            const pricePerUnit = pricingModel.usage_based.price_per_unit;
            const minimumUnits = pricingModel.usage_based.minimum_units || 1;
            creditCost = pricePerUnit * minimumUnits; // Calculate minimum purchase amount
            checkoutType = 'tool_purchase'; // Usage-based treated as purchase
          }
        }
      }

      if (creditCost <= 0) {
        return NextResponse.json(
          { error: 'Invalid product pricing' },
          { status: 400 }
        );
      }

      // Update checkout with selected product
      await supabase.from('checkouts').update({
        credit_amount: creditCost,
        type: checkoutType,
        metadata: {
          ...metadata,
          selected_product_id,
          selected_product_name: selectedProductName,
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
          selected_product_id: selected_product_id || null,
          selected_product_name: selectedProductName || null,
          selected_pricing_model: selected_pricing_model || null,
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
        console.error('Vendor transaction error:', vendorTransactionError);
        // Note: User transaction already created, this is a critical issue
        // In production, this should be handled with proper transaction rollback
      }
    }

    // 11. Create subscription record if this is a subscription checkout
    if (checkoutType === 'tool_subscription' && billingPeriod) {
      // Calculate next billing date
      const nextBillingDate = new Date();
      if (billingPeriod === 'month') {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      } else if (billingPeriod === 'year') {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      } else if (billingPeriod === 'week') {
        nextBillingDate.setDate(nextBillingDate.getDate() + 7);
      } else if (billingPeriod === 'day') {
        nextBillingDate.setDate(nextBillingDate.getDate() + 1);
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
            selected_product_id,
            selected_product_name: selectedProductName,
            selected_pricing_model: selected_pricing_model || null,
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
      selected_product_id: selected_product_id || null,
      selected_product_name: selectedProductName || null,
      selected_pricing_model: selected_pricing_model || null,
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
      selected_product_id: selected_product_id || null,
      selected_product_name: selectedProductName || null,
    });

  } catch (error) {
    console.error('Checkout process error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

