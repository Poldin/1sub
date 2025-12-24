/**
 * Webhook Alert System
 *
 * Sends email notifications for webhook failures using Resend.
 * Implements cooldown logic to prevent alert spam.
 */

import { Resend } from 'resend';
import { createServiceClient } from '@/infrastructure/database/client';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@1sub.io';
const FROM_EMAIL = process.env.FROM_EMAIL || 'alerts@1sub.io';
const ALERT_THRESHOLD = 5; // Alert if 5+ webhooks fail in one batch
const ALERT_COOLDOWN_HOURS = 1; // Don't spam alerts more than once per hour

interface AlertParams {
  count: number;
  period: string;
}

interface DeadLetterQueueEntry {
  id: string;
  tool_id: string;
  event_type: string;
  last_error: string;
  created_at: string;
}

/**
 * Send email alert for webhook failures to admin
 *
 * This function:
 * 1. Checks if we're in cooldown period (prevents spam)
 * 2. Only sends if failure count exceeds threshold
 * 3. Fetches recent failed webhooks for context
 * 4. Sends email via Resend
 * 5. Updates alert tracking in database
 */
export async function sendWebhookFailureAlert(
  params: AlertParams
): Promise<void> {
  const supabase = createServiceClient();

  try {
    // Check if we recently sent an alert (cooldown)
    const cooldownTime = new Date(
      Date.now() - ALERT_COOLDOWN_HOURS * 60 * 60 * 1000
    );

    const { data: recentAlerts } = await supabase
      .from('webhook_dead_letter_queue')
      .select('alert_sent_at')
      .gte('alert_sent_at', cooldownTime.toISOString())
      .limit(1);

    if (recentAlerts && recentAlerts.length > 0) {
      console.log('[Webhook Alert] Skipping alert due to cooldown period');
      return;
    }

    // Only alert if threshold exceeded
    if (params.count < ALERT_THRESHOLD) {
      console.log(
        `[Webhook Alert] Below threshold (${params.count} < ${ALERT_THRESHOLD}), not sending alert`
      );
      return;
    }

    // Fetch details of failed webhooks
    const { data: failures, error: fetchError } = await supabase
      .from('webhook_dead_letter_queue')
      .select('id, tool_id, event_type, last_error, created_at')
      .eq('status', 'unresolved')
      .order('created_at', { ascending: false })
      .limit(10);

    if (fetchError) {
      console.error('[Webhook Alert] Failed to fetch failures:', fetchError);
      return;
    }

    if (!failures || failures.length === 0) {
      console.log('[Webhook Alert] No unresolved failures found');
      return;
    }

    // Check if Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error(
        '[Webhook Alert] RESEND_API_KEY not configured, cannot send alert'
      );
      return;
    }

    // Send email using Resend
    const resend = new Resend(resendApiKey);

    const failuresList = failures
      .map(
        (f: DeadLetterQueueEntry) =>
          `- ${f.event_type} (Tool: ${f.tool_id.substring(0, 8)}...) - ${f.last_error}`
      )
      .join('\n');

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const dashboardUrl = `${siteUrl}/backoffice/webhooks`;

    const { error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject: `🚨 Webhook Failures: ${params.count} webhooks failed`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            h2 {
              color: #e53e3e;
              border-bottom: 2px solid #e53e3e;
              padding-bottom: 10px;
            }
            h3 {
              color: #2d3748;
              margin-top: 20px;
            }
            pre {
              background: #f7fafc;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
              padding: 15px;
              overflow-x: auto;
              font-size: 13px;
            }
            .button {
              display: inline-block;
              background: #3182ce;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 20px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #718096;
              font-size: 12px;
            }
            .warning {
              background: #fff5f5;
              border-left: 4px solid #e53e3e;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <h2>⚠️ Webhook Failure Alert</h2>

          <div class="warning">
            <strong>${params.count}</strong> webhooks failed in the last ${params.period} and have been moved to the dead letter queue.
          </div>

          <h3>Recent Failures:</h3>
          <pre>${failuresList}</pre>

          <p>These webhooks have exhausted all retry attempts (5 attempts with exponential backoff) and require manual attention.</p>

          <h3>Recommended Actions:</h3>
          <ul>
            <li>Review the webhook endpoints to ensure they are online and accessible</li>
            <li>Check the error messages for patterns (timeouts, 5xx errors, etc.)</li>
            <li>Contact affected vendors if their endpoints are consistently failing</li>
            <li>Consider manually retrying after the issue is resolved</li>
          </ul>

          <a href="${dashboardUrl}" class="button">View Webhook Dashboard →</a>

          <div class="footer">
            <p>This alert has a ${ALERT_COOLDOWN_HOURS}-hour cooldown to prevent spam.</p>
            <p>You are receiving this because you are configured as the admin for webhook monitoring.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (sendError) {
      console.error('[Webhook Alert] Failed to send email:', sendError);
      return;
    }

    // Update alert timestamp for cooldown tracking
    const now = new Date().toISOString();
    await supabase
      .from('webhook_dead_letter_queue')
      .update({
        alert_sent_at: now,
      })
      .in(
        'id',
        failures.map((f) => f.id)
      );

    console.log(
      `[Webhook Alert] Sent failure alert to ${ADMIN_EMAIL} for ${params.count} failed webhooks`
    );
  } catch (error) {
    console.error('[Webhook Alert] Failed to send alert:', error);
    // Don't throw - alerting is best-effort and shouldn't fail the cron job
  }
}

/**
 * Send email to vendor about their webhook failures
 *
 * This is an optional feature for Phase 2 that notifies vendors
 * when their webhook endpoints are consistently failing.
 *
 * Currently not called automatically - can be triggered manually from dashboard.
 */
export async function sendVendorWebhookFailureNotification(
  toolId: string,
  failureCount: number
): Promise<void> {
  const supabase = createServiceClient();

  try {
    // Get tool details
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('name, user_profile_id')
      .eq('id', toolId)
      .single();

    if (toolError || !tool) {
      console.error(
        '[Webhook Alert] Failed to fetch tool details:',
        toolError
      );
      return;
    }

    // Get vendor profile
    const { data: vendor, error: vendorError } = await supabase
      .from('vendor_profiles')
      .select('user_id')
      .eq('user_id', tool.user_profile_id)
      .single();

    if (vendorError || !vendor) {
      console.error(
        '[Webhook Alert] Failed to fetch vendor profile:',
        vendorError
      );
      return;
    }

    // Get vendor email from auth
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(vendor.user_id);

    if (userError || !userData?.user?.email) {
      console.error('[Webhook Alert] Failed to fetch vendor email:', userError);
      return;
    }

    // Check if Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error(
        '[Webhook Alert] RESEND_API_KEY not configured, cannot send notification'
      );
      return;
    }

    const resend = new Resend(resendApiKey);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const testWebhookUrl = `${siteUrl}/vendor-dashboard/api`;

    const { error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [userData.user.email],
      subject: `Webhook Delivery Issues for ${tool.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            h2 {
              color: #d69e2e;
              border-bottom: 2px solid #d69e2e;
              padding-bottom: 10px;
            }
            h3 {
              color: #2d3748;
              margin-top: 20px;
            }
            ul {
              background: #f7fafc;
              border-left: 4px solid #3182ce;
              padding: 20px 20px 20px 40px;
              margin: 15px 0;
            }
            .button {
              display: inline-block;
              background: #3182ce;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 20px;
            }
            .warning {
              background: #fffaf0;
              border: 1px solid #d69e2e;
              border-radius: 4px;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <h2>⚠️ Webhook Delivery Issues</h2>

          <div class="warning">
            We've detected issues delivering webhooks to <strong>${tool.name}</strong>.
            <br><br>
            <strong>${failureCount}</strong> webhooks have failed after multiple retry attempts.
          </div>

          <h3>What to check:</h3>
          <ul>
            <li>Ensure your webhook endpoint is accessible and online</li>
            <li>Check that your server returns 200-299 status codes for successful deliveries</li>
            <li>Verify the endpoint can handle POST requests with JSON payloads</li>
            <li>Review your server logs for errors or exceptions</li>
            <li>Confirm your endpoint can process requests within 15 seconds</li>
            <li>Check that your endpoint URL is correct and hasn't changed</li>
          </ul>

          <h3>How we handle retries:</h3>
          <p>
            When a webhook delivery fails with a server error (5xx) or timeout, we automatically retry with exponential backoff:
          </p>
          <ul>
            <li>Attempt 1: 1 minute later</li>
            <li>Attempt 2: 5 minutes later</li>
            <li>Attempt 3: 15 minutes later</li>
            <li>Attempt 4: 1 hour later</li>
            <li>Attempt 5: 6 hours later (final)</li>
          </ul>
          <p>
            After 5 failed attempts, the webhook is moved to a dead letter queue and no further retries are attempted.
          </p>

          <a href="${testWebhookUrl}" class="button">Test Your Webhook →</a>

          <p style="margin-top: 30px; color: #718096; font-size: 14px;">
            If you need assistance, please contact support with your tool ID: <code>${toolId}</code>
          </p>
        </body>
        </html>
      `,
    });

    if (sendError) {
      console.error(
        '[Webhook Alert] Failed to send vendor notification:',
        sendError
      );
      return;
    }

    console.log(
      `[Webhook Alert] Sent vendor notification to ${userData.user.email} for tool ${toolId}`
    );
  } catch (error) {
    console.error(
      '[Webhook Alert] Failed to send vendor notification:',
      error
    );
    // Don't throw - notification is best-effort
  }
}
