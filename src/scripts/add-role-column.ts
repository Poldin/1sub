import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.test')
dotenv.config({ path: envPath, override: true })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addRoleColumn() {
  try {
    console.log('🔧 Adding role column to users table...')
    
    // Check if role column already exists
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'users')
      .eq('column_name', 'role')
    
    if (columnError) {
      console.error('Error checking columns:', columnError)
      return
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ Role column already exists')
      return
    }
    
    // Add role column using raw SQL
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE public.users 
        ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
        
        CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
        
        UPDATE public.users SET role = 'user' WHERE role IS NULL;
      `
    })
    
    if (error) {
      console.error('❌ Error adding role column:', error)
    } else {
      console.log('✅ Role column added successfully')
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

addRoleColumn()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
