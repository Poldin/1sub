/**
 * Mock Vendor Server
 *
 * Simulates a vendor tool with callback and webhook endpoints for integration testing.
 * Used to test the complete vendor integration flow without requiring an actual vendor service.
 */

import express, { Express, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

export interface ReceivedWebhook {
  id: string;
  type: string;
  timestamp: string;
  payload: unknown;
  signature: string;
  isValid: boolean;
  receivedAt: Date;
}

export interface CallbackRequest {
  code: string;
  state: string;
  receivedAt: Date;
}

export class MockVendorServer {
  private app: Express;
  private server: any;
  private webhooks: ReceivedWebhook[] = [];
  private callbackRequests: CallbackRequest[] = [];
  private webhookSecret: string;
  private shouldFail: boolean = false;
  private baseUrl: string = '';

  constructor(webhookSecret: string) {
    this.webhookSecret = webhookSecret;
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    // Callback endpoint (receives authorization code redirect)
    this.app.get('/callback', (req: Request, res: Response) => {
      const { code, state } = req.query;
      
      if (code && state) {
        this.callbackRequests.push({
          code: code as string,
          state: state as string,
          receivedAt: new Date(),
        });
      }

      // In real vendor, this would exchange code server-to-server
      // For testing, just redirect to a success page
      res.redirect(`/vendor-dashboard?code=${code || ''}`);
    });

    // Webhook endpoint
    this.app.post('/webhook', (req: Request, res: Response) => {
      const signature = req.headers['x-1sub-signature'] as string;
      const payload = req.body;

      // Validate signature
      const isValid = this.validateSignature(signature, payload);

      // Store webhook
      this.webhooks.push({
        id: payload.id || 'unknown',
        type: payload.type || 'unknown',
        timestamp: payload.created ? new Date(payload.created * 1000).toISOString() : new Date().toISOString(),
        payload,
        signature: signature || '',
        isValid,
        receivedAt: new Date(),
      });

      // Simulate success/failure
      const status = this.shouldFail ? 500 : 200;
      this.shouldFail = false; // Reset after use

      res.status(status).json({
        received: true,
        valid: isValid,
        eventId: payload.id,
      });
    });

    // Test endpoint to check received webhooks
    this.app.get('/test/webhooks', (req: Request, res: Response) => {
      res.json({
        webhooks: this.webhooks,
        count: this.webhooks.length,
      });
    });

    // Test endpoint to check callback requests
    this.app.get('/test/callbacks', (req: Request, res: Response) => {
      res.json({
        callbacks: this.callbackRequests,
        count: this.callbackRequests.length,
      });
    });

    // Control endpoint for test scenarios (fail next webhook)
    this.app.post('/test/fail-next', (req: Request, res: Response) => {
      this.shouldFail = true;
      res.json({
        success: true,
        message: 'Next webhook will fail',
      });
    });

    // Control endpoint to reset state
    this.app.post('/test/reset', (req: Request, res: Response) => {
      this.webhooks = [];
      this.callbackRequests = [];
      this.shouldFail = false;
      res.json({
        success: true,
        message: 'State reset',
      });
    });
  }

  private validateSignature(signature: string | undefined, payload: unknown): boolean {
    if (!signature) {
      return false;
    }

    try {
      // Extract timestamp and signature from header format: "t=timestamp,v1=signature"
      const match = signature.match(/t=(\d+),v1=(.+)/);
      if (!match) {
        return false;
      }

      const timestamp = parseInt(match[1], 10);
      const providedSig = match[2];

      // Check timestamp (within 300s tolerance)
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > 300) {
        return false;
      }

      // Generate expected signature
      const payloadStr = JSON.stringify(payload);
      const signedPayload = `${timestamp}.${payloadStr}`;
      const expectedSig = createHmac('sha256', this.webhookSecret)
        .update(signedPayload)
        .digest('hex');

      // Timing-safe comparison to prevent timing attacks
      const expectedBuffer = Buffer.from(expectedSig, 'hex');
      const providedBuffer = Buffer.from(providedSig, 'hex');

      if (expectedBuffer.length !== providedBuffer.length) {
        return false;
      }

      return timingSafeEqual(expectedBuffer, providedBuffer);
    } catch (error) {
      console.error('[MockVendorServer] Signature validation error:', error);
      return false;
    }
  }

  async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(0, () => {
        const address = this.server.address();
        if (!address) {
          reject(new Error('Failed to get server address'));
          return;
        }
        this.baseUrl = `http://localhost:${address.port}`;
        resolve(this.baseUrl);
      });

      this.server.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error?: Error) => {
        if (error) {
          reject(error);
        } else {
          this.server = null;
          resolve();
        }
      });
    });
  }

  getReceivedWebhooks(): ReceivedWebhook[] {
    return [...this.webhooks];
  }

  getCallbackRequests(): CallbackRequest[] {
    return [...this.callbackRequests];
  }

  clearWebhooks(): void {
    this.webhooks = [];
    this.callbackRequests = [];
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
}

