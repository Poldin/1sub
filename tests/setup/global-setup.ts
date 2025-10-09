import { FullConfig } from '@playwright/test'
import { seedTestDatabase } from '../fixtures/seed-test-db'
import * as dotenv from 'dotenv'
import * as path from 'path'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...')
  
  // Load test environment variables
  const envPath = path.resolve(process.cwd(), '.env.test')
  const result = dotenv.config({ path: envPath, override: true })
  
  console.log('Environment variables loaded from:', envPath)
  console.log('Dotenv result:', result.error ? `Error: ${result.error.message}` : `Loaded ${Object.keys(result.parsed || {}).length} variables`)
  
  // Verify key variables are loaded
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set')
  console.log('TEST_USER_EMAIL:', process.env.TEST_USER_EMAIL ? 'Set' : 'Not set')
  
  try {
    // Seed test database
    await seedTestDatabase()
    
    console.log('✅ Global setup completed successfully!')
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  }
}

export default globalSetup
