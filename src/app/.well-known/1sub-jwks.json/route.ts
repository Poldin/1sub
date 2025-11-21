/**
 * API Endpoint: GET /.well-known/1sub-jwks.json
 * 
 * Publishes JSON Web Key Set (JWKS) for JWT verification.
 * External tools fetch this to verify JWT signatures in the redirect flow.
 * 
 * Features:
 * - Public endpoint (no authentication required)
 * - Returns active public keys only
 * - Supports key rotation
 * - Cached for performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface JWK {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n?: string;  // RSA modulus
  e?: string;  // RSA exponent
  x?: string;  // EC x coordinate
  y?: string;  // EC y coordinate
  crv?: string; // EC curve
}

interface JWKS {
  keys: JWK[];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // =======================================================================
    // Fetch Active JWKS Keys from Database
    // =======================================================================
    const { data: keys, error } = await supabase
      .from('jwks_keys')
      .select('kid, key_type, algorithm, public_key, metadata')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[JWKS] Error fetching keys:', error);
      return NextResponse.json<JWKS>(
        { keys: [] },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          }
        }
      );
    }

    // =======================================================================
    // Transform to JWKS Format
    // =======================================================================
    const jwks: JWKS = {
      keys: keys.map(key => {
        const jwk: JWK = {
          kty: key.key_type,
          kid: key.kid,
          use: 'sig',
          alg: key.algorithm,
        };

        // Parse public key (stored as JWK JSON string)
        try {
          const publicKeyData = JSON.parse(key.public_key);
          
          if (key.key_type === 'RSA') {
            jwk.n = publicKeyData.n;
            jwk.e = publicKeyData.e;
          } else if (key.key_type === 'EC') {
            jwk.crv = publicKeyData.crv;
            jwk.x = publicKeyData.x;
            jwk.y = publicKeyData.y;
          }
        } catch (parseError) {
          console.error('[JWKS] Error parsing public key for kid:', key.kid, parseError);
        }

        return jwk;
      }).filter(jwk => {
        // Only include keys with valid data
        if (jwk.kty === 'RSA') {
          return jwk.n && jwk.e;
        } else if (jwk.kty === 'EC') {
          return jwk.crv && jwk.x && jwk.y;
        }
        return false;
      })
    };

    // =======================================================================
    // Return JWKS with Caching Headers
    // =======================================================================
    return NextResponse.json<JWKS>(jwks, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*', // CORS for tools to fetch
        'Access-Control-Allow-Methods': 'GET',
      }
    });

  } catch (error) {
    console.error('[JWKS] Unexpected error:', error);
    return NextResponse.json<JWKS>(
      { keys: [] },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        }
      }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}



