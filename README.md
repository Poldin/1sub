# 1sub - Unified Subscription Platform

This is a [Next.js](https://nextjs.org) project for 1sub, a unified subscription platform that provides access to multiple tools through a single subscription.

## Token Architecture

The platform uses a simplified token system where tokens are only used at trust boundaries:

### User Access Tokens (Minimal)
- **Purpose:** Proves user is authenticated in 1sub
- **Used by:** External tools to verify user identity
- **Lifespan:** Short (1 hour)
- **Generated:** Only when user launches a tool
- **Endpoint:** `/api/v1/verify-user`

### Tool API Keys (Long-lived)
- **Purpose:** Proves tool is trusted by 1sub
- **Used by:** Tools to consume credits, log usage
- **Lifespan:** Long (revocable)
- **Generated:** During tool registration
- **Endpoints:** `/api/v1/credits/consume`, `/api/v1/tools/*`

### Flow
1. User clicks "Launch Tool" button
2. API generates short-lived access token (1 hour)
3. Redirects to tool with token as query param
4. Tool calls `/verify-user` with token
5. Tool uses its API key for subsequent calls

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
