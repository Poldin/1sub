import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { OneSub } from '../client.js';
import type { Entitlements, WebhookEvent } from '../types.js';

/**
 * Extended Express Request with 1Sub data
 */
export interface OneSubRequest extends Request {
  /** 1Sub user ID (set by requireEntitlement middleware) */
  oneSubUserId?: string;
  /** Entitlements data (set by requireEntitlement middleware) */
  oneSubEntitlements?: Entitlements;
  /** Webhook event (set by webhookHandler middleware) */
  oneSubEvent?: WebhookEvent;
  /** Verification token (updated by middleware) */
  oneSubVerificationToken?: string;
}

/**
 * Options for entitlement middleware
 */
export interface EntitlementMiddlewareOptions {
  /**
   * Function to extract verification token from request
   * Should return the token from session or cookies
   */
  getVerificationToken: (req: Request) => string | undefined | Promise<string | undefined>;

  /**
   * Function to update the verification token in the session
   * Called after successful verification with the new rolling token
   */
  updateVerificationToken: (req: Request, newToken: string) => void | Promise<void>;

  /**
   * Custom handler for unauthorized requests (no token)
   */
  onUnauthorized?: (req: Request, res: Response) => void;

  /**
   * Custom handler for users without valid entitlements
   */
  onNoEntitlement?: (req: Request, res: Response) => void;

  /**
   * Required plan IDs for access
   * If specified, user must have one of these plans
   */
  requiredPlans?: string[];

  /**
   * Required features for access
   * If specified, user must have all of these features
   */
  requiredFeatures?: string[];
}

/**
 * Options for webhook middleware
 */
export interface WebhookMiddlewareOptions {
  /**
   * Custom handler for invalid signatures
   */
  onInvalidSignature?: (req: Request, res: Response) => void;
}

/**
 * Create Express middleware for 1Sub integration
 */
export function createExpressMiddleware(onesub: OneSub) {
  return {
    /**
     * Middleware that requires valid entitlements
     *
     * @example
     * ```typescript
     * app.use('/premium', onesub.express.requireEntitlement({
     *   getVerificationToken: (req) => req.session.verificationToken,
     *   updateVerificationToken: (req, newToken) => {
     *     req.session.verificationToken = newToken;
     *   },
     *   requiredPlans: ['pro', 'enterprise'],
     * }));
     *
     * app.get('/premium/feature', (req, res) => {
     *   const entitlements = req.oneSubEntitlements;
     *   res.json({ credits: entitlements?.creditsRemaining });
     * });
     * ```
     */
    requireEntitlement(options: EntitlementMiddlewareOptions): RequestHandler {
      const {
        getVerificationToken,
        updateVerificationToken,
        onUnauthorized,
        onNoEntitlement,
        requiredPlans,
        requiredFeatures,
      } = options;

      return async (req: Request, res: Response, next: NextFunction) => {
        try {
          const token = await getVerificationToken(req);

          if (!token) {
            if (onUnauthorized) {
              onUnauthorized(req, res);
            } else {
              res.status(401).json({
                error: 'UNAUTHORIZED',
                message: 'No verification token found. User must authenticate.',
              });
            }
            return;
          }

          // Verify token and get entitlements
          const result = await onesub.verify.verify({
            verificationToken: token,
          });

          // Check if verification was successful
          if (!result.valid) {
            if (onNoEntitlement) {
              onNoEntitlement(req, res);
            } else {
              res.status(403).json({
                error: 'ENTITLEMENT_REVOKED',
                message: 'Access has been revoked',
                reason: result.reason,
                action: result.action,
              });
            }
            return;
          }

          // Update verification token (it rolls on each verify)
          await updateVerificationToken(req, result.verificationToken);

          // Check required plans if specified
          if (requiredPlans && requiredPlans.length > 0) {
            const hasPlan = result.entitlements.planId &&
              requiredPlans.includes(result.entitlements.planId);

            if (!hasPlan) {
              if (onNoEntitlement) {
                onNoEntitlement(req, res);
              } else {
                res.status(403).json({
                  error: 'PLAN_REQUIRED',
                  message: `One of these plans is required: ${requiredPlans.join(', ')}`,
                  currentPlan: result.entitlements.planId,
                });
              }
              return;
            }
          }

          // Check required features if specified
          if (requiredFeatures && requiredFeatures.length > 0) {
            const missingFeatures = requiredFeatures.filter(
              (feature) => !result.entitlements.features.includes(feature)
            );

            if (missingFeatures.length > 0) {
              if (onNoEntitlement) {
                onNoEntitlement(req, res);
              } else {
                res.status(403).json({
                  error: 'FEATURES_REQUIRED',
                  message: `Missing required features: ${missingFeatures.join(', ')}`,
                  missingFeatures,
                });
              }
              return;
            }
          }

          // Attach entitlements data to request
          (req as OneSubRequest).oneSubUserId = result.onesubUserId;
          (req as OneSubRequest).oneSubEntitlements = result.entitlements;
          (req as OneSubRequest).oneSubVerificationToken = result.verificationToken;

          next();
        } catch (error) {
          next(error);
        }
      };
    },

    /**
     * Middleware that optionally loads entitlements if user has a token
     * Does not block the request if no entitlements are found
     *
     * @example
     * ```typescript
     * app.use(onesub.express.loadEntitlements({
     *   getVerificationToken: (req) => req.session.verificationToken,
     *   updateVerificationToken: (req, newToken) => {
     *     req.session.verificationToken = newToken;
     *   },
     * }));
     *
     * app.get('/feature', (req, res) => {
     *   if (req.oneSubEntitlements?.planId) {
     *     // Premium path
     *   } else {
     *     // Free path
     *   }
     * });
     * ```
     */
    loadEntitlements(
      options: Pick<EntitlementMiddlewareOptions, 'getVerificationToken' | 'updateVerificationToken'>
    ): RequestHandler {
      const { getVerificationToken, updateVerificationToken } = options;

      return async (req: Request, _res: Response, next: NextFunction) => {
        try {
          const token = await getVerificationToken(req);

          if (token) {
            const result = await onesub.verify.verify({
              verificationToken: token,
            });

            if (result.valid) {
              await updateVerificationToken(req, result.verificationToken);
              (req as OneSubRequest).oneSubUserId = result.onesubUserId;
              (req as OneSubRequest).oneSubEntitlements = result.entitlements;
              (req as OneSubRequest).oneSubVerificationToken = result.verificationToken;
            }
          }
        } catch {
          // Silently ignore errors - entitlement data just won't be available
        }

        next();
      };
    },

    /**
     * Middleware for handling webhooks
     * Verifies signature and parses the event
     *
     * @example
     * ```typescript
     * app.post('/webhooks/1sub',
     *   express.raw({ type: 'application/json' }),
     *   onesub.express.webhookHandler(),
     *   (req, res) => {
     *     const event = req.oneSubEvent;
     *     console.log(`Received: ${event.type}`);
     *     res.json({ received: true });
     *   }
     * );
     * ```
     */
    webhookHandler(options: WebhookMiddlewareOptions = {}): RequestHandler {
      const { onInvalidSignature } = options;

      return (req: Request, res: Response, next: NextFunction) => {
        try {
          const signature = req.headers['1sub-signature'] as string;

          if (!signature) {
            if (onInvalidSignature) {
              onInvalidSignature(req, res);
            } else {
              res.status(401).json({
                error: 'MISSING_SIGNATURE',
                message: 'Missing 1sub-signature header',
              });
            }
            return;
          }

          // Get raw body - must use express.raw() middleware
          const payload =
            typeof req.body === 'string'
              ? req.body
              : Buffer.isBuffer(req.body)
              ? req.body.toString('utf8')
              : JSON.stringify(req.body);

          // Verify and parse event
          const event = onesub.webhooks.constructEvent(payload, signature);

          // Attach event to request
          (req as OneSubRequest).oneSubEvent = event;

          next();
        } catch (error) {
          if (onInvalidSignature) {
            onInvalidSignature(req, res);
          } else {
            res.status(401).json({
              error: 'INVALID_SIGNATURE',
              message: 'Invalid webhook signature',
            });
          }
        }
      };
    },

    /**
     * Middleware that requires minimum credit balance
     *
     * @example
     * ```typescript
     * app.post('/api/generate',
     *   onesub.express.requireEntitlement({
     *     getVerificationToken: (req) => req.session.verificationToken,
     *     updateVerificationToken: (req, newToken) => { req.session.verificationToken = newToken; }
     *   }),
     *   onesub.express.requireCredits(10),
     *   async (req, res) => {
     *     // User has at least 10 credits
     *   }
     * );
     * ```
     */
    requireCredits(minimumCredits: number): RequestHandler {
      return (req: Request, res: Response, next: NextFunction) => {
        const entitlements = (req as OneSubRequest).oneSubEntitlements;

        if (!entitlements) {
          res.status(500).json({
            error: 'MIDDLEWARE_ORDER',
            message: 'requireCredits must be used after requireEntitlement',
          });
          return;
        }

        const credits = entitlements.creditsRemaining ?? 0;

        if (credits < minimumCredits) {
          res.status(402).json({
            error: 'INSUFFICIENT_CREDITS',
            message: `Requires ${minimumCredits} credits, you have ${credits}`,
            currentBalance: credits,
            required: minimumCredits,
            shortfall: minimumCredits - credits,
          });
          return;
        }

        next();
      };
    },
  };
}

// Type augmentation for Express
declare global {
  namespace Express {
    interface Request {
      oneSubUserId?: string;
      oneSubEntitlements?: Entitlements;
      oneSubEvent?: WebhookEvent;
      oneSubVerificationToken?: string;
    }
  }
}

export type ExpressMiddleware = ReturnType<typeof createExpressMiddleware>;
