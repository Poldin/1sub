/**
 * Email Service
 * 
 * Handles sending emails using Resend for vendor notifications and other system emails.
 */

import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const FROM_EMAIL = process.env.FROM_EMAIL || 'security@1sub.io';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://1sub.io';

/**
 * Send vendor application approval email
 */
export async function sendVendorApprovalEmail(params: {
  to: string;
  vendorName: string;
  companyName: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('sendVendorApprovalEmail called', {
      to: params.to,
      vendorName: params.vendorName,
      companyName: params.companyName,
      hasResendKey: !!process.env.RESEND_API_KEY,
      fromEmail: FROM_EMAIL,
    });

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email send', {
        to: params.to,
        companyName: params.companyName,
      });
      return { success: false, error: 'Email service not configured' };
    }

    const { to, vendorName, companyName } = params;

    console.log('Sending vendor approval email via Resend', {
      from: FROM_EMAIL,
      to,
      companyName,
    });

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: '🎉 Your Vendor Application Has Been Approved!',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Vendor Application Approved</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3ecf8e 0%, #2dd4bf 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-top: 0;">Hi ${vendorName || 'there'},</p>
              
              <p style="font-size: 16px;">Great news! Your vendor application for <strong>${companyName}</strong> has been approved.</p>
              
              <p style="font-size: 16px;">You can now start creating and publishing tools on the 1sub platform. Here's what you can do next:</p>
              
              <ul style="font-size: 16px; padding-left: 20px;">
                <li>Create your first tool</li>
                <li>Set up pricing and products</li>
                <li>Start earning credits from tool usage</li>
                <li>Track analytics and revenue</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${SITE_URL}/vendor-dashboard/publish" 
                   style="display: inline-block; background: #3ecf8e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Go to Vendor Dashboard
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                If you have any questions, please don't hesitate to reach out to our support team.
              </p>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
                Best regards,<br>
                The 1sub Team
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending vendor approval email via Resend:', {
        error,
        errorMessage: error.message,
        errorName: error.name,
        to,
        companyName,
        from: FROM_EMAIL,
      });
      return { success: false, error: error.message };
    }

    console.log('Vendor approval email sent successfully via Resend:', {
      emailId: data?.id,
      to,
      companyName,
      from: FROM_EMAIL,
    });
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in sendVendorApprovalEmail:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      to: params.to,
      companyName: params.companyName,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Send vendor application rejection email
 */
export async function sendVendorRejectionEmail(params: {
  to: string;
  vendorName: string;
  companyName: string;
  rejectionReason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('sendVendorRejectionEmail called', {
      to: params.to,
      vendorName: params.vendorName,
      companyName: params.companyName,
      hasResendKey: !!process.env.RESEND_API_KEY,
      fromEmail: FROM_EMAIL,
    });

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email send', {
        to: params.to,
        companyName: params.companyName,
      });
      return { success: false, error: 'Email service not configured' };
    }

    const { to, vendorName, companyName, rejectionReason } = params;

    console.log('Sending vendor rejection email via Resend', {
      from: FROM_EMAIL,
      to,
      companyName,
    });

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Vendor Application Update',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Vendor Application Update</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f3f4f6; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #374151; margin: 0; font-size: 28px;">Application Update</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-top: 0;">Hi ${vendorName || 'there'},</p>
              
              <p style="font-size: 16px;">Thank you for your interest in becoming a vendor on 1sub. Unfortunately, we are unable to approve your vendor application for <strong>${companyName}</strong> at this time.</p>
              
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <p style="font-size: 14px; color: #991b1b; margin: 0; font-weight: 600;">Reason:</p>
                <p style="font-size: 14px; color: #7f1d1d; margin: 10px 0 0 0;">${rejectionReason}</p>
              </div>
              
              <p style="font-size: 16px;">If you believe this decision was made in error, or if you'd like to address the concerns mentioned above and reapply, please don't hesitate to contact our support team.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${SITE_URL}/support" 
                   style="display: inline-block; background: #374151; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Contact Support
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                We appreciate your interest in 1sub and hope to work with you in the future.
              </p>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
                Best regards,<br>
                The 1sub Team
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending vendor rejection email via Resend:', {
        error,
        errorMessage: error.message,
        errorName: error.name,
        to,
        companyName,
        from: FROM_EMAIL,
      });
      return { success: false, error: error.message };
    }

    console.log('Vendor rejection email sent successfully via Resend:', {
      emailId: data?.id,
      to,
      companyName,
      from: FROM_EMAIL,
    });
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in sendVendorRejectionEmail:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      to: params.to,
      companyName: params.companyName,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

