# RealReach CRM

RealReach CRM is a commercial SaaS for real estate agencies focused on one core promise: **Speed to Lead Wins Deals**.

This codebase includes:

- Public marketing site with premium dark theme and animated sections.
- Authentication flow with Supabase Auth.
- Paddle Billing integration (checkout, subscription sync, customer portal).
- Subscription and plan-based feature gating.
- CRM app shell with billing settings and gated modules.
- Supabase SQL schema with RLS for multi-tenant organizations.

## Architecture

- `src/App.tsx`
  Public landing page, pricing page, auth pages, app shell, trial reminders, feature lock upgrade modal, billing settings UI.

- `src/lib/plans.ts`
  Plan definitions (Basic/Pro/Agency), seat limits, gate matrix, trial helpers.

- `src/lib/analytics.ts`
  Analytics adapter abstraction for landing conversion and billing events.

- `src/lib/paddleClient.ts`
  Client-side Paddle.js initializer for overlay checkout.

- `api/billing/create-checkout.ts`
  Creates Paddle transaction checkout URL (server-side).

- `api/billing/customer-portal.ts`
  Creates Paddle customer portal session URL.

- `api/billing/subscription.ts`
  Returns organization subscription state from Supabase.

- `api/paddle/webhook.ts`
  Verifies `Paddle-Signature` and persists subscription lifecycle changes to Supabase.

- `api/_lib/subscriptionMiddleware.ts`
  Reusable subscription enforcement helper for protected API routes.

- `supabase/migrations/202606280001_estateflow_schema.sql`
  Core CRM tables + subscriptions + analytics events + RLS.

## Billing Flow

Landing Page -> Start Free Trial -> Select Plan -> Paddle Checkout -> Paddle Webhook -> Subscription persisted -> Org owner signs in -> App access granted.

No subscription state is trusted from frontend alone. Access checks should be performed via API middleware using stored subscription status.

## Required Environment Variables

Copy `.env.example` to `.env` and set all Paddle + Supabase keys.

Critical:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PADDLE_CLIENT_TOKEN`
- `PADDLE_API_KEY`
- `PADDLE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

## Local Development

1. Install dependencies
`npm install`

2. Run app
`npm run dev`

3. Build
`npm run build`

## Supabase Setup

1. Create Supabase project.
2. Apply `supabase/migrations/202606280001_estateflow_schema.sql`.
3. Run `supabase/seed.sql` if you want starter records.
4. Add `organization_id` claim in JWT for strict RLS policies.

## Paddle Setup

1. Create products/prices for Basic, Pro, Agency in Paddle.
2. Set price IDs in both client and server env variables.
3. Create webhook destination pointing to `/api/paddle/webhook`.
4. Use destination `endpoint_secret_key` as `PADDLE_WEBHOOK_SECRET`.
5. Subscribe to events:
   - `subscription.created`
   - `subscription.activated`
   - `subscription.updated`
   - `subscription.canceled`
   - `transaction.completed`
   - `transaction.payment_failed`

## Production Deployment (Vercel)

1. Import repo into Vercel.
2. Add all environment variables.
3. Deploy.
4. Add Paddle webhook endpoint URL from production domain.

## Notes

- Feature limits are intended to be enforced server-side in API routes using `enforceSubscription()`.
- If keys are missing, auth/billing actions will fail loudly instead of faking success.
