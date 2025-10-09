import { createClient } from '@supabase/supabase-js'
import { TEST_USERS, TEST_TOOLS, TEST_DATA } from './test-credentials'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables first
const envPath = path.resolve(process.cwd(), '.env.test')
dotenv.config({ path: envPath, override: true })

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Check if we have real credentials or placeholders
const hasRealCredentials = supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('your-test-project')

console.log('🔍 Checking credentials:')
console.log('  supabaseUrl:', supabaseUrl ? 'Set' : 'Not set')
console.log('  supabaseServiceKey:', supabaseServiceKey ? 'Set' : 'Not set')
console.log('  hasRealCredentials:', hasRealCredentials)

let supabase: any = null

if (hasRealCredentials) {
  supabase = createClient(supabaseUrl, supabaseServiceKey)
} else {
  console.log('⚠️ Skipping database seeding - using placeholder credentials')
  console.log('To enable database seeding, update .env.test with real Supabase credentials')
}

export async function seedTestDatabase() {
  if (!hasRealCredentials) {
    console.log('🌱 Mock database seeding (no real database connection)')
    console.log('✅ Mock setup completed successfully!')
    return
  }

  console.log('🌱 Seeding test database...')
  
  try {
    // 1. Create test users
    await createTestUsers()
    
    // 2. Create test tools
    await createTestTools()
    
    // 3. Set up credit balances
    await setupCreditBalances()
    
    console.log('✅ Test database seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding test database:', error)
    throw error
  }
}

async function createTestUsers() {
  if (!supabase) return
  
  console.log('👤 Setting up test users...')
  
  // Check if users already exist in auth system
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingEmails = existingUsers.users.map((u: { email?: string }) => u.email)
  
  // Create regular user if it doesn't exist
  if (!existingEmails.includes(TEST_USERS.user.email)) {
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: TEST_USERS.user.email,
      password: TEST_USERS.user.password,
      email_confirm: true,
      user_metadata: {
        full_name: TEST_USERS.user.fullName,
        role: 'user'
      }
    })
    
    if (userError) {
      console.log('Error creating user:', userError.message)
    } else {
      console.log('✅ Created test user:', userData.user?.email)
    }
  } else {
    console.log('✅ Test user already exists:', TEST_USERS.user.email)
  }
  
  // Create admin user if it doesn't exist
  if (!existingEmails.includes(TEST_USERS.admin.email)) {
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email: TEST_USERS.admin.email,
      password: TEST_USERS.admin.password,
      email_confirm: true,
      user_metadata: {
        full_name: TEST_USERS.admin.fullName,
        role: 'admin'
      }
    })
    
    if (adminError) {
      console.log('Error creating admin:', adminError.message)
    } else {
      console.log('✅ Created admin user:', adminData.user?.email)
    }
  } else {
    console.log('✅ Admin user already exists:', TEST_USERS.admin.email)
  }
  
  // Ensure users exist in the users table with correct roles
  await ensureUsersInTable()
}

async function ensureUsersInTable() {
  if (!supabase) return
  
  console.log('👥 Ensuring users exist in users table with correct roles...')
  
  // Get all auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  
  for (const authUser of authUsers.users) {
    if (authUser.email === TEST_USERS.user.email || authUser.email === TEST_USERS.admin.email) {
      const role = authUser.email === TEST_USERS.admin.email ? 'admin' : 'user'
      
      // Upsert user in users table
      const { error } = await supabase
        .from('users')
        .upsert({
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email,
          role: role,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
      
      if (error) {
        console.log(`Error upserting user ${authUser.email}:`, error.message)
      } else {
        console.log(`✅ Ensured user ${authUser.email} has role: ${role}`)
      }
    }
  }
}

async function createTestTools() {
  if (!supabase) return
  
  console.log('🔧 Creating test tools...')
  
  for (const tool of TEST_TOOLS) {
      const { data, error } = await supabase
        .from('tools')
        .upsert({
          name: tool.name,
          description: tool.description,
          credit_cost_per_use: tool.cost,
          is_active: tool.is_active,
          url: tool.endpoint,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'name'
        })
    
    if (error) {
      console.log(`Tool ${tool.name} already exists or error:`, error.message)
    } else {
      console.log(`✅ Created/updated tool: ${tool.name}`)
    }
  }
}

async function setupCreditBalances() {
  if (!supabase) return
  
  console.log('💰 Setting up credit balances...')
  
  // Get user IDs
  const { data: users } = await supabase.auth.admin.listUsers()
  
  for (const user of users.users) {
    const userRole = user.user_metadata?.role || 'user'
    const initialCredits = userRole === 'admin' ? TEST_DATA.adminCredits : TEST_DATA.initialCredits
    
    // Create or update credit balance
    const { error } = await supabase
      .from('credit_balances')
      .upsert({
        user_id: user.id,
        balance: initialCredits,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
    
    if (error) {
      console.log(`Error setting credits for ${user.email}:`, error.message)
    } else {
      console.log(`✅ Set ${initialCredits} credits for ${user.email}`)
    }
  }
}

export async function clearTestDatabase() {
  if (!hasRealCredentials) {
    console.log('🧹 Mock database cleanup (no real database connection)')
    console.log('✅ Mock teardown completed successfully!')
    return
  }

  console.log('🧹 Clearing test database (keeping users)...')
  
  try {
    // Only delete test tools, keep users since they're manually configured
    for (const tool of TEST_TOOLS) {
      await supabase
        .from('tools')
        .delete()
        .eq('name', tool.name)
      console.log(`🗑️ Deleted tool: ${tool.name}`)
    }
    
    console.log('✅ Test database cleared (users preserved)!')
  } catch (error) {
    console.error('❌ Error clearing test database:', error)
    throw error
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedTestDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
