/**
 * API Endpoint: POST /api/v1/tools/link/exchange-code
 * 
 * Exchanges a short-lived link code for a user link mapping.
 * This is the fallback flow when redirect+JWT is not viable.
 * 
 * Features:
 * - Bearer token authentication (tool API key)
 * - Rate limiting (30 requests per minute per tool)
 * - Input validation
 * - Idempotent (repeated exchanges with same data return existing link)
 * - Codes are single-use and expire after 5-10 minutes
 * - Security audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findToolByApiKey } from '@/lib/api-keys';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { 
  ExchangeCodeRequest, 
  ExchangeCodeResponse,
  APIError 
} from '@/lib/tool-verification-types';

const EXCHANGE_CODE_RATE_LIMIT = {
  limit: 30,
  windowMs: 60000, // 1 minute
};

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  
  try {
    // =======================================================================
    // 1. Authentication - Extract and verify API key
    // =======================================================================
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<APIError>(
        {
          error: 'Unauthorized',
          message: 'API key is required in Authorization header (Bearer token)',
        },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7);

    // =======================================================================
    // 2. Rate Limiting
    // =======================================================================
    const rateLimitResult = checkRateLimit(
      `exchange-code:${apiKey.substring(0, 20)}`,
      EXCHANGE_CODE_RATE_LIMIT
    );

    if (!rateLimitResult.success) {
      return NextResponse.json<APIError>(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': EXCHANGE_CODE_RATE_LIMIT.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // =======================================================================
    // 3. Verify Tool API Key
    // =======================================================================
    const toolData = await findToolByApiKey(apiKey);

    if (!toolData) {
      return NextResponse.json<APIError>(
        {
          error: 'Unauthorized',
          message: 'Invalid API key',
        },
        { status: 401 }
      );
    }

    if (!toolData.isActive) {
      return NextResponse.json<APIError>(
        {
          error: 'Forbidden',
          message: 'Tool is not active',
        },
        { status: 403 }
      );
    }

    // =======================================================================
    // 4. Parse and Validate Request Body
    // =======================================================================
    let body: ExchangeCodeRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json<APIError>(
        {
          error: 'Invalid request',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    const { code, toolUserId } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json<APIError>(
        {
          error: 'Invalid request',
          message: 'Code is required and must be a string',
        },
        { status: 422 }
      );
    }

    if (!toolUserId || typeof toolUserId !== 'string') {
      return NextResponse.json<APIError>(
        {
          error: 'Invalid request',
          message: 'toolUserId is required and must be a string',
        },
        { status: 422 }
      );
    }

    // Normalize code (uppercase, trim)
    const normalizedCode = code.toUpperCase().trim();

    // =======================================================================
    // 5. Exchange Code Using Database Function
    // =======================================================================
    const supabase = await createClient();

    const { data: exchangeResultRaw, error: exchangeError } = await supabase
      .rpc('exchange_tool_link_code', {
        p_code: normalizedCode,
        p_tool_id: toolData.toolId,
        p_tool_user_id: toolUserId
      })
      .single();

    type ExchangeResult = { success: boolean; onesub_user_id: string; message: string };
    const exchangeResult = (exchangeResultRaw as unknown as ExchangeResult | null);

    if (exchangeError) {
      console.error('[Exchange Code] RPC error:', exchangeError);
      return NextResponse.json<APIError>(
        {
          error: 'Internal error',
          message: 'Failed to exchange code',
        },
        { status: 500 }
      );
    }

    // =======================================================================
    // 6. Handle Exchange Result
    // =======================================================================
    if (!exchangeResult || !exchangeResult.success) {
      const message = exchangeResult?.message || 'Invalid or expired code';
      
      // Determine appropriate status code
      let statusCode = 400;
      if (message.includes('already linked')) {
        statusCode = 409; // Conflict
      }

      return NextResponse.json<APIError>(
        {
          error: 'Invalid code',
          message: message,
        },
        { status: statusCode }
      );
    }

    // =======================================================================
    // 7. Build and Return Success Response
    // =======================================================================
    const response: ExchangeCodeResponse = {
      linked: true,
      oneSubUserId: exchangeResult.onesub_user_id,
      toolUserId: toolUserId,
      linkedAt: new Date().toISOString(),
    };

    return NextResponse.json<ExchangeCodeResponse>(response, {
      status: 200,
      headers: {
        'X-RateLimit-Limit': EXCHANGE_CODE_RATE_LIMIT.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
      }
    });

  } catch (error) {
    console.error('[Exchange Code] Unexpected error:', error);
    return NextResponse.json<APIError>(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

