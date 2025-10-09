import { FullConfig } from '@playwright/test'
import { clearTestDatabase } from '../fixtures/seed-test-db'
import * as dotenv from 'dotenv'
import * as path from 'path'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...')
  
  // Load test environment variables
  const envPath = path.resolve(process.cwd(), '.env.test')
  dotenv.config({ path: envPath })
  
  try {
    // Clear test database
    await clearTestDatabase()
    
    console.log('✅ Global teardown completed successfully!')
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown
