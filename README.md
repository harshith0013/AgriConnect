# AgriConnect Phase 2 MVP

AgriConnect is a multilingual React PWA for farmers and buyers. Phase 2 adds separate role-aware accounts and a local Node.js + Prisma + SQLite marketplace backend while preserving the farmer-first visual foundation.

## Run locally

Install dependencies:

```bash
npm install
```

Initialize the local SQLite database:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Start the API and frontend in separate terminals:

```bash
npm run dev:api
npm run dev
```

The frontend runs at the Vite URL, normally `http://localhost:5173`. The API runs at `http://localhost:4000`.

Useful checks:

```bash
npm run lint
npm run build
npm run build:api
```

## Phase 2 functionality

- Separate Farmer and Buyer registration and login paths
- Role-aware farmer and buyer dashboards
- English and Telugu language support for the new marketplace screens
- Farmer produce listing creation and management
- Listing fields for crop, category, quantity, unit, quality, price, availability, location, and description
- Buyer browsing and crop search over active listings
- Buyer offer submission with quantity validation
- Farmer offer review, acceptance, and rejection
- Transactional accepted-offer to order creation
- Buyer and farmer order views
- Server-side ownership and role authorization
- SQLite persistence through Prisma
- PWA shell and offline indicator retained from Phase 1

## Project structure

```text
backend/src/server.ts       Express API, auth, marketplace routes
prisma/schema.prisma        SQLite data model and relationships
prisma/migrations/          Database migration history
src/App.tsx                 Role-aware screens and marketplace workflows
src/api.ts                  Frontend API client and domain types
src/i18n.ts                 Existing Phase 1 translations
src/phase2Translations.ts   English and Telugu marketplace translations
src/index.css               Shared responsive visual system
src/marketplace.css         Marketplace-specific responsive styles
vite.config.ts              Vite, Tailwind, and PWA configuration
```

## API overview

- `POST /api/auth/register/farmer`
- `POST /api/auth/register/buyer`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/listings`
- `GET /api/listings/mine`
- `POST /api/listings`
- `PATCH /api/listings/:id`
- `DELETE /api/listings/:id`
- `GET /api/listings/:id/offers`
- `POST /api/listings/:id/offers`
- `GET /api/offers/mine`
- `PATCH /api/offers/:id/status`
- `GET /api/orders/mine`

Use `Authorization: Bearer <token>` for protected endpoints. The backend validates role, ownership, quantities, listing availability, and accepted-offer order creation.

## MVP limitations

This is a local development MVP. Authentication uses JWTs and bcrypt password hashes, but the default secret in `.env` is development-only and must be replaced for deployment. There is no OTP verification, email verification, production secret management, image upload storage, payments, transport booking, live mandi pricing, AI diagnosis, or full offline synchronization.

The service worker caches the application shell. Marketplace mutations require the API to be available and are not queued offline. Hosted Supabase/Firebase adapters are not included because the approved authoritative implementation is the local Node + Prisma + SQLite backend.

## Review flow

1. Open the landing page and choose either Farmer or Buyer account.
2. Register a farmer, create a produce listing, then sign out.
3. Register a buyer, browse the listing, and submit an offer.
4. Sign back in as the farmer and accept or reject the offer.
5. Open Orders from either role and verify the accepted order.
6. Switch to Telugu and repeat the new screen navigation.
