import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables first
const envPath = path.resolve(process.cwd(), '.env.test')
dotenv.config({ path: envPath, override: true })

export const TEST_USERS = {
  user: {
    email: process.env.TEST_USER_EMAIL || 'testuser@example.com',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    fullName: 'Test User'
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!',
    fullName: 'Admin User'
  }
}

export const TEST_TOOLS = [
  {
    name: 'Demo Quote Tool',
    description: 'Generate quotes for demo purposes',
    cost: 10,
    is_active: true,
    endpoint: '/api/v1/tools/demo-quote'
  },
  {
    name: 'GPT Utility Tool',
    description: 'GPT-powered utility tool',
    cost: 25,
    is_active: true,
    endpoint: '/api/v1/tools/gpt-util'
  },
  {
    name: 'N8N Webhook Tool',
    description: 'N8N webhook integration tool',
    cost: 15,
    is_active: true,
    endpoint: '/api/v1/tools/n8n-webhook'
  }
]

export const TEST_DATA = {
  initialCredits: 100,
  adminCredits: 1000
}
