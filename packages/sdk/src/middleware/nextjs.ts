import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { OneSub } from '../client.js';
import type { Entitlements, WebhookEvent } from '../types.js';

/**
 * Options for Next.js entitlement middleware
 */
export interface NextEntitlementOptions {
  /**
   * Function to extract verification token from request
   */
  getVerificationToken: (req: NextRequest) => string | undefined | Promise<string | undefined>;

  /**
   * Function to update the verification token (for rolling tokens)
   * This should update the cookie or session with the new token
   */
  updateVerificationToken?: (req: NextRequest, res: NextResponse, newToken: string) => void | Promise<void>;

  /**
   * Required plan IDs for access
   */
  requiredPlans?: string[];

  /**
   * Required features for access
   */
  requiredFeatures?: string[];

  /**
   * Custom redirect URL for unauthorized users (no token)
   */
  unauthorizedRedirect?: string;

  /**
   * Custom redirect URL for users without valid entitlements
   */
  noEntitlementRedirect?: string;
}

/**
 * Result from entitlement check
 */
export interface EntitlementCheckResult {
  authorized: boolean;
  entitlements?: Entitlements;
  onesubUserId?: string;
  newToken?: string;
  error?: string;
}

/**
 * Create Next.js utilities for 1Sub integration
 */
export function createNextMiddleware(onesub: OneSub) {
  return {
    /**
     * Check entitlement status (for use in middleware.ts)
     *
     * @example
     * ```typescript
     * // middleware.ts
     * import { onesub } from '@/lib/onesub';
     *
     * export async function middleware(req: NextRequest) {
     *   const result = await onesub.next.checkEntitlement(req, {
     *     getVerificationToken: (req) => req.cookies.get('verificationToken')?.value,
     *   });
     *
     *   if (!result.authorized) {
     *     return NextResponse.redirect('/subscribe');
     *   }
     *
     *   // Update token in cookie if it rolled
     *   const response = NextResponse.next();
     *   if (result.newToken) {
     *     response.cookies.set('verificationToken', result.newToken);
     *   }
     *   return response;
     * }
     * ```
     */
    async checkEntitlement(
      req: NextRequest,
      options: NextEntitlementOptions
    ): Promise<EntitlementCheckResult> {
      const { getVerificationToken, requiredPlans, requiredFeatures } = options;

      try {
        const token = await getVerificationToken(req);

        if (!token) {
          return { authorized: false, error: 'No verification token found' };
        }

        const result = await onesub.verify.verify({
          verificationToken: token,
        });

        if (!result.valid) {
          return {
            authorized: false,
            error: result.reason,
          };
        }

        // Check required plans
        if (requiredPlans && requiredPlans.length > 0) {
          const hasPlan = result.entitlements.planId &&
            requiredPlans.includes(result.entitlements.planId);

          if (!hasPlan) {
            return {
              authorized: false,
              entitlements: result.entitlements,
              error: `Plan required: ${requiredPlans.join(' or ')}`,
            };
          }
        }

        // Check required features
        if (requiredFeatures && requiredFeatures.length > 0) {
          const missingFeatures = requiredFeatures.filter(
            (feature) => !result.entitlements.features.includes(feature)
          );

          if (missingFeatures.length > 0) {
            return {
              authorized: false,
              entitlements: result.entitlements,
              error: `Missing features: ${missingFeatures.join(', ')}`,
            };
          }
        }

        return {
          authorized: true,
          entitlements: result.entitlements,
          onesubUserId: result.onesubUserId,
          newToken: result.verificationToken,
        };
      } catch (error) {
        return {
          authorized: false,
          error: error instanceof Error ? error.message : 'Verification failed',
        };
      }
    },

    /**
     * Create middleware function for protected routes
     *
     * @example
     * ```typescript
     * // middleware.ts
     * import { onesub } from '@/lib/onesub';
     *
     * export const middleware = onesub.next.withEntitlement({
     *   getVerificationToken: (req) => req.cookies.get('verificationToken')?.value,
     *   noEntitlementRedirect: '/subscribe',
     *   unauthorizedRedirect: '/login',
     *   requiredPlans: ['pro', 'enterprise'],
     * });
     *
     * export const config = {
     *   matcher: ['/dashboard/:path*', '/api/premium/:path*'],
     * };
     * ```
     */
    withEntitlement(options: NextEntitlementOptions) {
      return async (req: NextRequest) => {
        const result = await this.checkEntitlement(req, options);

        if (!result.authorized) {
          const token = await options.getVerificationToken(req);

          if (!token) {
            // User not authenticated (no token)
            if (options.unauthorizedRedirect) {
              return NextResponse.redirect(
                new URL(options.unauthorizedRedirect, req.url)
              );
            }
            return NextResponse.json(
              { error: 'UNAUTHORIZED', message: 'No verification token found' },
              { status: 401 }
            );
          }

          // User has token but no valid entitlement
          if (options.noEntitlementRedirect) {
            return NextResponse.redirect(
              new URL(options.noEntitlementRedirect, req.url)
            );
          }
          return NextResponse.json(
            {
              error: 'ENTITLEMENT_REQUIRED',
              message: result.error || 'Valid entitlement required',
            },
            { status: 403 }
          );
        }

        // Add entitlement data to headers for downstream use
        const response = NextResponse.next();
        if (result.onesubUserId) {
          response.headers.set('x-onesub-user-id', result.onesubUserId);
        }
        if (result.entitlements) {
          response.headers.set(
            'x-onesub-credits',
            String(result.entitlements.creditsRemaining ?? 0)
          );
          response.headers.set(
            'x-onesub-plan',
            result.entitlements.planId || 'none'
          );
        }

        // Update token in cookie if it rolled
        if (result.newToken && options.updateVerificationToken) {
          await options.updateVerificationToken(req, response, result.newToken);
        }

        return response;
      };
    },

    /**
     * Verify webhook in API route handler
     *
     * @example
     * ```typescript
     * // app/api/webhooks/1sub/route.ts
     * import { onesub } from '@/lib/onesub';
     *
     * export async function POST(req: Request) {
     *   const result = await onesub.next.verifyWebhook(req);
     *
     *   if (!result.success) {
     *     return Response.json({ error: result.error }, { status: 401 });
     *   }
     *
     *   const event = result.event;
     *   console.log(`Received: ${event.type}`);
     *
     *   return Response.json({ received: true });
     * }
     * ```
     */
    async verifyWebhook(
      req: Request
    ): Promise<
      | { success: true; event: WebhookEvent }
      | { success: false; error: string }
    > {
      try {
        const signature = req.headers.get('1sub-signature');

        if (!signature) {
          return { success: false, error: 'Missing 1sub-signature header' };
        }

        const payload = await req.text();
        const event = onesub.webhooks.constructEvent(payload, signature);

        return { success: true, event };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Invalid signature',
        };
      }
    },

    /**
     * Handle webhook with registered handlers
     *
     * @example
     * ```typescript
     * // app/api/webhooks/1sub/route.ts
     * import { onesub } from '@/lib/onesub';
     *
     * // Register handlers
     * onesub.webhooks.on('subscription.activated', async (event) => {
     *   await sendWelcomeEmail(event.data.oneSubUserId);
     * });
     *
     * export async function POST(req: Request) {
     *   return onesub.next.handleWebhook(req);
     * }
     * ```
     */
    async handleWebhook(req: Request): Promise<Response> {
      const result = await this.verifyWebhook(req);

      if (!result.success) {
        return Response.json(
          { error: 'INVALID_SIGNATURE', message: result.error },
          { status: 401 }
        );
      }

      try {
        await onesub.webhooks.handle(result.event);
        return Response.json({ received: true });
      } catch (error) {
        console.error('Webhook handling error:', error);
        return Response.json(
          { error: 'HANDLER_ERROR', message: 'Failed to process webhook' },
          { status: 500 }
        );
      }
    },

    /**
     * Helper to verify entitlements in API route
     *
     * @example
     * ```typescript
     * // app/api/premium/route.ts
     * import { onesub } from '@/lib/onesub';
     *
     * export async function GET(req: Request) {
     *   const token = req.headers.get('x-verification-token');
     *   const result = await onesub.next.verifyEntitlements(token);
     *   if (!result || !result.valid) {
     *     return Response.json({ error: 'No valid entitlements' }, { status: 403 });
     *   }
     *   return Response.json({ credits: result.entitlements.creditsRemaining });
     * }
     * ```
     */
    async verifyEntitlements(
      verificationToken: string | null
    ): Promise<Awaited<ReturnType<typeof onesub.verify.verify>> | null> {
      if (!verificationToken) {
        return null;
      }
      try {
        return await onesub.verify.verify({ verificationToken });
      } catch {
        return null;
      }
    },

    /**
     * Helper to consume credits in API route
     *
     * @example
     * ```typescript
     * // app/api/generate/route.ts
     * import { onesub } from '@/lib/onesub';
     *
     * export async function POST(req: Request) {
     *   const { oneSubUserId } = await req.json();
     *
     *   const result = await onesub.next.consumeCredits(
     *     oneSubUserId,
     *     10,
     *     'Image generation',
     *     `gen-${Date.now()}`
     *   );
     *
     *   if (!result.success) {
     *     return Response.json(result, { status: 402 });
     *   }
     *
     *   // Generate image...
     *   return Response.json({ success: true });
     * }
     * ```
     */
    async consumeCredits(
      userId: string,
      amount: number,
      reason: string,
      idempotencyKey: string
    ) {
      return onesub.credits.tryConsume({
        userId,
        amount,
        reason,
        idempotencyKey,
      });
    },
  };
}

export type NextMiddleware = ReturnType<typeof createNextMiddleware>;
