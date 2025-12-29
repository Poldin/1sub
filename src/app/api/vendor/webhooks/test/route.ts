/**
 * Test Webhook Endpoint
 *
 * Allows vendors to send a test webhook to their configured webhook URL
 * to verify their integration is working correctly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateWebhookSignature } from '@/security';
import type { WebhookPayload, WebhookEventType } from '@/lib/tool-verification-types';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ==========================================================================
    // 1. Authenticate User
    // ==========================================================================
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ==========================================================================
    // 2. Parse Request Body
    // ==========================================================================
    const body = await request.json();
    const { tool_id, event_type } = body;

    if (!tool_id) {
      return NextResponse.json(
        { error: 'tool_id is required' },
        { status: 400 }
      );
    }

    // Validate event type
    const validEventTypes: WebhookEventType[] = [
      // Subscription lifecycle
      'subscription.activated',
      'subscription.updated',
      'subscription.canceled',
      // Purchases
      'purchase.completed',
      // Access management
      'entitlement.granted',
      'entitlement.revoked',
      'entitlement.changed',
      // Credits
      'credits.consumed',
      'user.credit_low',
      'user.credit_depleted',
      // System
      'tool.status_changed',
      'verify.required'
    ];

    const selectedEventType: WebhookEventType = validEventTypes.includes(event_type)
      ? event_type
      : 'subscription.activated';

    // ==========================================================================
    // 3. Verify Tool Ownership
    // ==========================================================================
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('id, name, user_profile_id')
      .eq('id', tool_id)
      .eq('user_profile_id', user.id)
      .single();

    if (toolError || !tool) {
      return NextResponse.json(
        { error: 'Tool not found or not authorized' },
        { status: 403 }
      );
    }

    // ==========================================================================
    // 4. Get Webhook Configuration
    // ==========================================================================
    const { data: apiKey, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('metadata')
      .eq('tool_id', tool_id)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKey) {
      return NextResponse.json(
        { error: 'No API key found for this tool' },
        { status: 404 }
      );
    }

    const metadata = apiKey.metadata as Record<string, unknown> || {};
    const webhookUrl = metadata.webhook_url as string;
    const webhookSecret = metadata.webhook_secret as string;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'No webhook URL configured. Please configure a webhook URL in the API settings.' },
        { status: 400 }
      );
    }

    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'No webhook secret configured. Please generate a webhook secret in the API settings.' },
        { status: 400 }
      );
    }

    // ==========================================================================
    // 5. Build Test Webhook Payload
    // ==========================================================================
    const testUserId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const cancelEffectiveDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 2 weeks from now

    let eventData: WebhookPayload['data'];

    switch (selectedEventType) {
      case 'subscription.activated':
        eventData = {
          oneSubUserId: testUserId,
          userEmail: 'test@example.com',
          planId: 'test-plan-monthly',
          status: 'active',
          currentPeriodEnd: periodEnd,
          quantity: 1,
          creditsRemaining: 100,
        };
        break;

      case 'subscription.canceled':
        eventData = {
          oneSubUserId: testUserId,
          userEmail: 'test@example.com',
          planId: 'test-plan-monthly',
          status: 'canceled',
          currentPeriodEnd: periodEnd,
          effectiveDate: cancelEffectiveDate,
          cancellationReason: 'user_requested',
          quantity: 1,
        };
        break;

      case 'subscription.updated':
        eventData = {
          oneSubUserId: testUserId,
          userEmail: 'test@example.com',
          planId: 'test-plan-yearly',
          status: 'active',
          currentPeriodEnd: periodEnd,
          quantity: 1,
          creditsRemaining: 200,
        };
        break;

      case 'purchase.completed':
        eventData = {
          oneSubUserId: testUserId,
          userEmail: 'test@example.com',
          checkoutId: `test_checkout_${crypto.randomUUID().slice(0, 8)}`,
          amount: 50,
          creditsRemaining: 150,
          purchaseType: 'credits',
        };
        break;

      case 'entitlement.granted':
        eventData = {
          oneSubUserId: testUserId,
          userEmail: 'test@example.com',
          grantId: `test_grant_${crypto.randomUUID().slice(0, 8)}`,
          planId: 'test-plan-pro',
          status: 'active',
          creditsRemaining: 100,
        };
        break;

      case 'entitlement.revoked':
        eventData = {
          oneSubUserId: testUserId,
          userEmail: 'test@example.com',
          reason: 'subscription_canceled',
          revokedAt: new Date().toISOString(),
          status: 'canceled',
        };
        break;

      case 'entitlement.changed':
        eventData = {
          oneSubUserId: testUserId,
          userEmail: 'test@example.com',
          previousState: {
            planId: 'test-plan-basic',
            features: ['feature1', 'feature2'],
          },
          newState: {
            planId: 'test-plan-pro',
            features: ['feature1', 'feature2', 'feature3'],
          },
          planId: 'test-plan-pro',
          creditsRemaining: 200,
        };
        break;

      case 'credits.consumed':
        eventData = {
          oneSubUserId: testUserId,
          amount: 5,
          balanceRemaining: 45,
          transactionId: `test_txn_${crypto.randomUUID().slice(0, 8)}`,
        };
        break;

      case 'user.credit_low':
        eventData = {
          oneSubUserId: testUserId,
          userEmail: 'test@example.com',
          creditBalance: 8,
          threshold: 10,
        };
        break;

      case 'user.credit_depleted':
        eventData = {
          oneSubUserId: testUserId,
          userEmail: 'test@example.com',
          creditBalance: 0,
        };
        break;

      case 'tool.status_changed':
        eventData = {
          oneSubUserId: 'system',
          toolId: tool_id,
          toolStatus: true,
        };
        break;

      case 'verify.required':
        eventData = {
          oneSubUserId: testUserId,
          userEmail: 'test@example.com',
          reason: 'security_check',
        };
        break;

      default:
        eventData = {
          oneSubUserId: testUserId,
          userEmail: 'test@example.com',
          planId: 'test-plan',
          status: 'active',
        };
    }

    const payload: WebhookPayload = {
      id: `test_${crypto.randomUUID()}`,
      type: selectedEventType,
      created: now,
      data: eventData,
    };

    const payloadString = JSON.stringify(payload);

    // ==========================================================================
    // 6. Generate Signature and Send Webhook
    // ==========================================================================
    const signature = generateWebhookSignature(payloadString, webhookSecret);

    const startTime = Date.now();
    let response: Response;
    let responseBody: string | null = null;
    let responseStatus: number;

    try {
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-1Sub-Signature': signature,
          'User-Agent': '1sub-webhooks/1.0 (test)',
        },
        body: payloadString,
      });

      responseStatus = response.status;

      try {
        responseBody = await response.text();
      } catch {
        responseBody = null;
      }
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      return NextResponse.json({
        success: false,
        error: `Failed to connect to webhook URL: ${errorMessage}`,
        details: {
          webhookUrl,
          eventType: selectedEventType,
          payloadSent: payload,
          signatureHeader: signature,
        }
      }, { status: 502 });
    }

    const responseTime = Date.now() - startTime;

    // ==========================================================================
    // 7. Return Result
    // ==========================================================================
    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Test webhook sent successfully!',
        details: {
          webhookUrl,
          eventType: selectedEventType,
          responseStatus,
          responseTime: `${responseTime}ms`,
          payloadSent: payload,
          signatureHeader: signature,
          responseBody: responseBody?.slice(0, 500), // Truncate long responses
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `Webhook endpoint returned status ${responseStatus}`,
        details: {
          webhookUrl,
          eventType: selectedEventType,
          responseStatus,
          responseTime: `${responseTime}ms`,
          payloadSent: payload,
          signatureHeader: signature,
          responseBody: responseBody?.slice(0, 500),
        }
      });
    }

  } catch (error) {
    console.error('[Test Webhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
