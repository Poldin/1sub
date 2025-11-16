/**
 * Initialize JWKS Keys for Tool JWT Signing
 * 
 * This script generates RSA key pairs for signing JWTs in the redirect flow.
 * Run this once during setup or when rotating keys.
 * 
 * Usage:
 *   npx tsx scripts/init-jwks-keys.ts
 */

import { generateKeyPair, exportJWK, exportPKCS8 } from 'jose';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/database_types';
import dotenv from 'dotenv';

// Load env vars from .env.local (Next.js style) or fallback to .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function initializeJWKS() {
  console.log('Generating RSA key pair...');
  
  // Generate RSA-2048 key pair
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  
  // Export keys
  const publicJWK = await exportJWK(publicKey);
  const privateKeyPEM = await exportPKCS8(privateKey);
  
  // Generate key ID
  const kid = `key-${new Date().toISOString().split('T')[0]}`;
  
  console.log('Inserting key into database...');
  
  // Check if a primary key already exists
  const { data: existingKeys } = await supabase
    .from('jwks_keys')
    .select('id, kid, is_primary')
    .eq('is_active', true)
    .eq('is_primary', true);
  
  if (existingKeys && existingKeys.length > 0) {
    console.log('Found existing primary key:', existingKeys[0].kid);
    console.log('Marking it as non-primary...');
    
    // Mark existing keys as non-primary
    await supabase
      .from('jwks_keys')
      .update({ is_primary: false })
      .eq('is_primary', true);
  }
  
  // Insert new key
  const { data: newKey, error } = await supabase
    .from('jwks_keys')
    .insert({
      kid: kid,
      key_type: 'RSA',
      algorithm: 'RS256',
      public_key: JSON.stringify(publicJWK),
      private_key_ref: kid, // Reference to ENV var or vault
      is_active: true,
      is_primary: true,
      metadata: {
        created_by: 'init-jwks-keys script',
        purpose: 'tool JWT signing',
      }
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error inserting key:', error);
    process.exit(1);
  }
  
  console.log('\n✅ Key generated successfully!');
  console.log('\nKey ID:', kid);
  console.log('\nPublic JWK (stored in database):');
  console.log(JSON.stringify(publicJWK, null, 2));
  console.log('\n⚠️  IMPORTANT: Add this to your environment variables:');
  console.log('\nJWT_TOOL_PRIVATE_KEY=');
  console.log(privateKeyPEM);
  console.log('\n⚠️  Store this private key securely!');
  console.log('⚠️  Never commit it to version control!');
  console.log('\nYou can verify the JWKS endpoint at:');
  console.log('GET /.well-known/1sub-jwks.json');
}

initializeJWKS()
  .then(() => {
    console.log('\n✅ JWKS initialization complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

