# AgriConnect Phase 5 MVP

AgriConnect is a multilingual React PWA for farmers and buyers. Phase 5 adds a safe crop-assistance foundation on top of the completed Phase 1–4 modules.

## Run locally

Install dependencies:

```bash
npm install
```

Initialize the local SQLite database:

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma migrate dev --name market_prices
npx prisma migrate dev --name phase4_logistics
npx prisma migrate dev --name crop_diagnoses
```

Start both the API and frontend with one command:

```bash
npm run dev:all
```

Or start them in separate terminals:

```bash
npm run dev:api
npm run dev
```

The frontend runs at the Vite URL, normally `http://localhost:5173`. The API runs at `http://localhost:4000`.

## Deploy to Render

This repository includes `render.yaml` for a single Render web service. The service builds the React frontend, serves it from Express, runs Prisma migrations at startup, and exposes the API under `/api`.

1. Push the repository to GitHub and create a Render Blueprint from the repository.
2. Review the service in `render.yaml` and deploy it. The Blueprint uses a Starter instance because SQLite and private crop uploads require a persistent disk; the free instance filesystem is ephemeral.
3. Set `GEMINI_API_KEY` as a Render secret environment variable. Never put the key in `render.yaml`, `.env.example`, or frontend variables.
4. Set `CLIENT_ORIGIN` to the final Render URL if the service name or URL changes from `https://agric-connect.onrender.com`.
5. Open the Render URL. The frontend and API are served by the same service, so no `VITE_API_URL` value is required.

Render deployment commands:

```text
Build:  npm ci && npx prisma generate && npm run build:api && npm run build
Start:  npm start
```

The Render service uses `DATABASE_URL=file:/var/data/agriconnect.db` and stores private crop uploads under `/var/data/private-uploads`. Do not deploy the local `dev.db` or `.env` files.

Useful checks:

```bash
npm run lint
npm run build
npm run build:api
```

## Phase 3 functionality

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
- Market Prices section in the farmer dashboard
- Crop and market/district search
- Side-by-side mandi price comparison
- Explicit sample-data source and retrieval timestamp labels
- Historical price table
- Buyer offer versus mandi reference comparison
- Estimated gross and net proceeds calculator
- Cold-storage directory with location, crop, and district filtering
- Cold-storage facility details and pending storage requests
- Storage request history and farmer-owned cancellation
- Transport-provider directory with service-area filtering
- Pending transport requests with pickup and destination details
- Transport request history and farmer-owned cancellation
- Development-only logistics status update endpoint for administrators
- Farmer-only Crop Assistance upload and diagnosis history
- JPEG, PNG, and WebP validation with a 5 MB limit
- Private local image storage outside the public web directory
- Modular mock inference provider with low-confidence handling
- Explicit demo-result labeling and KVK/agricultural-expert escalation guidance
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
src/phase3Translations.ts   English and Telugu market-price translations
src/marketPrices.tsx        Market comparison and proceeds calculator
src/index.css               Shared responsive visual system
src/marketplace.css         Marketplace-specific responsive styles
src/marketPrices.css        Market-price responsive styles
src/logistics.tsx           Storage and transport screens
src/logistics.css           Logistics responsive styles
src/phase4Translations.ts   English and Telugu logistics translations
src/cropAssistance.tsx      Crop upload, demo result, and diagnosis history UI
src/cropAssistance.css      Crop Assistance responsive styles
src/phase5Translations.ts   English and Telugu crop-assistance translations
backend/src/cropInference.ts Modular inference-provider interface and mock provider
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
- `GET /api/market-prices`
- `GET /api/market-prices/compare?crop=Paddy`
- `GET /api/market-prices/history?crop=Paddy`
- `GET /api/market-prices/offer-comparison?offerId=<id>`
- `GET /api/cold-storage`
- `GET /api/cold-storage/:id`
- `POST /api/storage-requests`
- `GET /api/storage-requests/mine`
- `PATCH /api/storage-requests/:id/cancel`
- `GET /api/transport-providers`
- `GET /api/transport-providers/:id`
- `POST /api/transport-requests`
- `GET /api/transport-requests/mine`
- `PATCH /api/transport-requests/:id/cancel`
- `POST /api/crop-diagnoses`
- `GET /api/crop-diagnoses/mine`

Use `Authorization: Bearer <token>` for protected endpoints. The backend validates role, ownership, quantities, listing availability, and accepted-offer order creation.

## Crop Assistance configuration

The current provider is intentionally a separated mock provider:

```env
CROP_INFERENCE_MODE=mock
CROP_MODEL_NAME=development-demo-provider
CROP_MODEL_VERSION=0.1.0
CROP_CONFIDENCE_THRESHOLD=0.70
CROP_UPLOAD_DIR=private-uploads
```

Crop Assistance results are labeled **Development demo result** and are not real AI diagnoses. The mock provider returns a low-confidence demo image review for supported demo crops and an unsupported result for other crops. It does not claim a disease, recommend pesticides, provide dosages, or guarantee treatment.

Uploads are stored under a private server directory and are never exposed through a public static route. Diagnosis history is filtered by the authenticated farmer ID. Production deployment should replace local storage with private object storage and signed access controls.

The model boundary is defined by `CropInferenceProvider` in `backend/src/cropInference.ts`. A validated ONNX, TensorFlow Lite, or cloud provider can replace the mock provider later after supported classes, preprocessing, licensing, evaluation data, and confidence calibration are established.

## Provider and logistics data configuration

The current approved Phase 4 mode uses clearly labeled sample facility and transport-provider data:

```env
LOGISTICS_DATA_MODE=sample
```

Sample facilities and providers are not verified real-world records. The UI identifies them as development sample information, does not claim availability, does not invent contact details or charges, and does not calculate distance without verified coordinates. Device location permission is not required to browse.

Storage and transport submissions remain `PENDING`. They are not bookings, assignments, or confirmations.

For development review only, request status can be updated by an administrator/database operator through:

```text
PATCH /api/dev/logistics/storage/:id/status
PATCH /api/dev/logistics/transport/:id/status
```

Example body:

```json
{ "status": "ACCEPTED" }
```

This endpoint is disabled when `NODE_ENV=production`. It is not a provider portal and does not introduce a provider account role. A future phase could add provider users, provider authentication, response permissions, verified facility/provider feeds, and an operator dashboard.

## Market data configuration

The current approved development mode is sample data. It is visibly labeled **Development sample data** in the UI and API responses. No market values are presented as live information.

Configuration is kept backend-only:

```env
MARKET_DATA_MODE=sample
DATA_GOV_API_KEY=
DATA_GOV_RESOURCE_ID=
MARKET_DATA_CACHE_MINUTES=30
```

The intended live provider is Agmarknet through data.gov.in. The repository does not currently contain a verified resource ID or API credential, and the referenced data.gov.in help URL returned a 404 during planning. Live provider integration is therefore intentionally not enabled. The provider boundary is in `backend/src/marketPrices.ts`; a verified adapter can be added without exposing credentials to the frontend.

## MVP limitations

This is a local development MVP. Authentication uses JWTs and bcrypt password hashes, but the default secret in `.env` is development-only and must be replaced for deployment. There is no OTP verification, email verification, production secret management, image upload storage, payments, transport booking, live mandi pricing, AI diagnosis, or full offline synchronization. Sample price records are not a substitute for official market data.

The service worker caches the application shell. Marketplace mutations require the API to be available and are not queued offline. Hosted Supabase/Firebase adapters are not included because the approved authoritative implementation is the local Node + Prisma + SQLite backend.

## Review flow

1. Open the landing page and register or log in as a farmer.
2. Open **Cold Storage** and search the sample directory.
3. Submit a storage request and confirm it appears as `PENDING`.
4. Open **Transport Services** and search the sample provider directory.
5. Submit a transport request and confirm it appears as `PENDING`.
6. Cancel an eligible request and confirm it becomes `CANCELLED`.
7. Open **Market Prices** and confirm Phase 3 remains available.
8. Switch to Telugu and repeat the logistics navigation.
9. Verify the existing buyer, listing, offer, and order workflows remain available.
