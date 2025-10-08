import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Validation schemas
const userWaitlistSchema = z.object({
  email: z.string().email('Invalid email address'),
  type: z.literal('user'),
  name: z.string().optional(),
  company: z.string().optional(),
});

const vendorWaitlistSchema = z.object({
  email: z.string().email('Invalid email address'),
  type: z.literal('vendor'),
  name: z.string().min(1, 'Name is required for vendors'),
  company: z.string().min(1, 'Company is required for vendors'),
});

const waitlistSchema = z.union([userWaitlistSchema, vendorWaitlistSchema]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input
    const validationResult = waitlistSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const { email, type, name, company } = validationResult.data;

    // Check if email already exists in waitlist
    const { data: existingEntry } = await supabaseAdmin
      .from('waitlist')
      .select('id, type')
      .eq('email', email)
      .single();

    if (existingEntry) {
      return NextResponse.json(
        { error: 'Email already registered for waitlist' },
        { status: 409 }
      );
    }

    // Insert into database
    const { data: waitlistEntry, error: dbError } = await supabaseAdmin
      .from('waitlist')
      .insert({
        email,
        name: name || null,
        company: company || null,
        use_case: null,
        type,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save to waitlist' },
        { status: 500 }
      );
    }

    // Send admin notification email
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && process.env.RESEND_API_KEY) {
        const subject = `New ${type} waitlist signup - 1sub.io`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3ecf8e;">New Waitlist Signup</h2>
            <p><strong>Type:</strong> ${type === 'user' ? 'User' : 'Vendor'}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${name ? `<p><strong>Name:</strong> ${name}</p>` : ''}
            ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">
              This notification was sent from the 1sub.io waitlist system.
            </p>
          </div>
        `;

        await resend.emails.send({
          from: 'noreply@1sub.io',
          to: adminEmail,
          subject,
          html,
        });
      }
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined waitlist',
      data: {
        id: waitlistEntry.id,
        type: waitlistEntry.type,
        email: waitlistEntry.email,
      }
    });

  } catch (error) {
    console.error('Waitlist submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
