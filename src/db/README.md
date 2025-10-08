# 1sub Database Schema

This directory contains the complete database schema for the 1sub MVP Phase 1.

## Files

- `schema.sql` - Complete table definitions with indexes and constraints
- `triggers.sql` - Database triggers for auto-updates and user creation
- `seed.sql` - Sample data for testing and development

## Database Tables

### Core Tables
- `users` - User profiles (extends Supabase auth.users)
- `credit_balances` - Current credit balance per user
- `credit_transactions` - Immutable ledger of all credit movements
- `tools` - Registry of integrated tools
- `usage_logs` - Log of tool usage and credit consumption

### Key Features
- **Row Level Security (RLS)** - Users can only access their own data
- **Atomic Credit Operations** - Prevents race conditions and double-spending
- **Idempotency** - Duplicate transactions are prevented
- **Audit Trail** - Complete history of all credit movements
- **Auto-triggers** - Credit balances created automatically on user signup

## Deployment Instructions

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run `schema.sql` first
4. Run `triggers.sql` second
5. Run `seed.sql` for sample data

### Option 2: Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

## Environment Variables Required

Add these to your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Testing

Use a separate Supabase staging project for testing:
1. Create a new Supabase project for staging
2. Apply the same schema
3. Use staging credentials in your test environment

## Security Notes

- All tables use RLS policies
- Service role key required for credit operations
- Idempotency keys prevent duplicate transactions
- Credit balances cannot go negative


