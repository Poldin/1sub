# 1sub - Unified Subscription Platform

1sub is a unified subscription platform that provides access to multiple tools through a single subscription. Built with Next.js, TypeScript, Supabase, and Stripe, it enables users to discover, purchase, and use various tools while vendors can easily integrate and monetize their services.

## Overview

1sub consolidates multiple SaaS tools into one subscription platform, allowing users to:
- Access multiple tools with a single subscription
- Purchase credits for pay-as-you-go tools
- Discover new tools in one place
- Manage all subscriptions from a unified dashboard

Vendors can:
- Integrate their tools via REST API
- Monetize through credits or subscriptions
- Access analytics and usage metrics
- Manage tool listings and pricing

## Features

### User Features
- **Unified Dashboard**: Manage all tools and subscriptions in one place
- **Credit System**: Purchase and use credits across multiple tools
- **Subscription Plans**: Monthly and annual subscription options
- **Tool Discovery**: Search and browse available tools by category
- **Profile Management**: User profiles with subscription and credit tracking

### Vendor Features
- **Vendor Dashboard**: Complete tool management interface
- **API Integration**: RESTful API for tool integration
- **Analytics**: Usage tracking and revenue analytics
- **Flexible Pricing**: Support for one-time, subscription, and usage-based pricing
- **Webhook Support**: Real-time notifications for subscription events

### Technical Features
- **JWT Authentication**: Secure token-based authentication
- **API Key Management**: Long-lived API keys for tool authentication
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **Audit Logging**: Comprehensive audit logs for security
- **Stripe Integration**: Payment processing via Stripe Connect

## Architecture

### Token Architecture

The platform uses a simplified token system where tokens are only used at trust boundaries:

#### User Access Tokens (Minimal)
- **Purpose**: Proves user is authenticated in 1sub
- **Used by**: External tools to verify user identity
- **Lifespan**: Short (1 hour)
- **Generated**: Only when user launches a tool
- **Endpoint**: `/api/v1/verify-user`

#### Tool API Keys (Long-lived)
- **Purpose**: Proves tool is trusted by 1sub
- **Used by**: Tools to consume credits, log usage
- **Lifespan**: Long (revocable)
- **Generated**: During tool registration
- **Endpoints**: `/api/v1/credits/consume`, `/api/v1/tools/*`

#### Authentication Flow
1. User clicks "Launch Tool" button
2. API generates short-lived access token (1 hour)
3. Redirects to tool with token as query param
4. Tool calls `/verify-user` with token
5. Tool uses its API key for subsequent calls

### Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + JWT
- **Payments**: Stripe
- **Styling**: Tailwind CSS
- **State Management**: SWR for data fetching
- **Email**: Resend

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account and project
- Stripe account (for payments)
- Resend account (for emails)

### Installation

#### 1. Clone the repository

```bash
git clone <repository-url>
cd 1sub-dev
```

#### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

#### 3. Set up environment variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
# Get these from: https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
# Generate a secure random string (e.g., using openssl rand -hex 32)
JWT_SECRET=your_jwt_secret_key

# Email Configuration (for waitlist notifications)
ADMIN_EMAIL=your-admin@email.com
RESEND_API_KEY=your_resend_api_key

# Stripe Configuration
# Get these from: https://dashboard.stripe.com/developers/apikeys
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_WEBHOOK_SECRET_CONNECT=your_stripe_connect_webhook_secret

# Admin API Key (for cron jobs)
# Generate a secure random string (e.g., using openssl rand -hex 32)
ADMIN_API_KEY=your_admin_api_key

# Application URL (required for Stripe redirects)
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Optional: Minimum credits required for vendor payout (default: 50)
MIN_PAYOUT_CREDITS=50
```

> **Important:** Never commit the `.env.local` file to version control. Make sure to set these environment variables in your deployment platform (Vercel, etc.) as well.

#### 4. Set up Supabase database

Apply database migrations using the Supabase CLI:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

> **Tip:** Alternatively, you can apply migrations manually through the Supabase Dashboard SQL Editor. See [`documentation/DEPLOYMENT_QUICKSTART.md`](./documentation/DEPLOYMENT_QUICKSTART.md) for detailed instructions.

#### 5. Run the development server

Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
1sub-dev/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   │   ├── v1/            # Public API v1 endpoints
│   │   │   ├── vendor/        # Vendor API endpoints
│   │   │   ├── admin/         # Admin API endpoints
│   │   │   └── ...
│   │   ├── vendor-dashboard/  # Vendor dashboard pages
│   │   ├── admin/             # Admin pages
│   │   └── ...                # User-facing pages
│   ├── components/            # React components
│   ├── lib/                   # Utility functions and services
│   │   ├── auth/              # Authentication utilities
│   │   ├── credits.ts         # Credit system logic
│   │   ├── api-keys.ts        # API key management
│   │   └── ...
│   └── hooks/                 # Custom React hooks
├── supabase/
│   └── migrations/            # Database migrations
├── docs/                      # Mintlify documentation
├── documentation/             # Project documentation and guides
├── public/                    # Static assets
└── scripts/                   # Utility scripts
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Migrations

Database migrations are located in `supabase/migrations/`. To create a new migration:

```bash
supabase migration new migration_name
```

Apply migrations:

```bash
supabase db push
```

> **Warning:** Always test migrations in a development environment before applying to production. See [`documentation/DEPLOYMENT_QUICKSTART.md`](./documentation/DEPLOYMENT_QUICKSTART.md) for deployment procedures.

## Environment Variables

### Required Variables

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard → Settings → API |
| `JWT_SECRET` | Secret for JWT token signing | Generate using `openssl rand -hex 32` |
| `ADMIN_EMAIL` | Admin email for notifications | Your email address |
| `RESEND_API_KEY` | Resend API key for emails | Resend Dashboard |
| `STRIPE_SECRET_KEY` | Stripe secret key | Stripe Dashboard → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret (payment events) | Stripe Dashboard → Developers → Webhooks |
| `STRIPE_WEBHOOK_SECRET_CONNECT` | Stripe Connect webhook secret | Stripe Dashboard → Developers → Webhooks |
| `ADMIN_API_KEY` | Admin API key for cron jobs | Generate using `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | Your application URL | Your production domain (e.g., `https://1sub.io`) |

## Deployment

### Deploy to Vercel

The easiest way to deploy your Next.js app is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy

> **Info:** For detailed deployment instructions, including database migration procedures, see [`documentation/DEPLOYMENT_QUICKSTART.md`](./documentation/DEPLOYMENT_QUICKSTART.md).

### Database Security

The project includes comprehensive security measures for the Supabase database:

- Row Level Security (RLS) policies
- Function search path fixes
- API key security policies
- Audit logging

See [`documentation/SUPABASE_SECURITY_FIX_SUMMARY.md`](./documentation/SUPABASE_SECURITY_FIX_SUMMARY.md) for details on security implementations.

## Documentation

### For Developers

- [API Integration Guide](./documentation/API_INTEGRATION_GUIDE.md) - Guide for integrating external tools
- [API Endpoints Reference](./documentation/API_ENDPOINTS_REFERENCE.md) - Complete API reference
- [Deployment Quickstart](./documentation/DEPLOYMENT_QUICKSTART.md) - Deployment procedures

### For Vendors

Comprehensive vendor documentation is available in the `docs/` directory, built with Mintlify:

- [Vendor Integration Docs](./docs/) - Complete integration guide
- [Quickstart Guide](./docs/quickstart.mdx) - Get started in 15 minutes
- [API Reference](./docs/api/reference.mdx) - API documentation
- [Webhooks Guide](./docs/webhooks/overview.mdx) - Webhook integration

## Key Features Implementation

### Credit System
- User balance tracking
- Credit consumption with idempotency
- Transaction history
- Credit packages

### Subscription Management
- Platform subscriptions (monthly/annual)
- Tool-specific subscriptions
- Plan upgrades/downgrades
- Trial periods

### Vendor Tools
- Tool registration and verification
- API key generation and management
- Usage analytics
- Revenue tracking

## Security

The platform implements multiple security measures:

- **JWT Authentication**: Secure token-based authentication
- **API Key Security**: HMAC signatures and rate limiting
- **Row Level Security**: Database-level access control
- **Audit Logging**: Comprehensive audit trails
- **Input Validation**: Zod schema validation
- **Rate Limiting**: API endpoint protection

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Supabase Documentation](https://supabase.com/docs) - Supabase guides and references
- [Stripe Documentation](https://stripe.com/docs) - Stripe integration guides

## License

This project is private and proprietary.

---

## Quick Links

- **Vendor Dashboard**: [https://1sub.io/vendor-dashboard](https://1sub.io/vendor-dashboard)
- **Discord Community**: [https://discord.gg/R87YSYpKK](https://discord.gg/R87YSYpKK)
- **Documentation**: See `docs/` directory for complete vendor integration documentation
