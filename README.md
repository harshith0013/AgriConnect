# AgriConnect Phase 1

AgriConnect is a farmer-first React Progressive Web App foundation for crop care and future direct market access. This repository contains only Phase 1: multilingual onboarding, basic farmer profile capture, and the initial offline app shell.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The production checks are:

```bash
npm run lint
npm run build
npm run preview
```

## Implemented

- React + Vite + TypeScript frontend
- Tailwind CSS v4 integration with a responsive custom visual system
- Responsive landing page with accessible, touch-friendly controls
- English and Telugu language selection, persisted in local storage
- Farmer registration with name, mobile, language, state, district, and village/block
- Farm information form with farm size and crops cultivated
- Basic validation with localized error messages
- Development-only mock login flow; no passwords are stored
- Local profile preference persistence for the demo onboarding flow
- Farmer dashboard with clearly marked future service placeholders:
  Crop Care, Sell Produce, Market Prices, Cold Storage, Transport Services, and Buyers/FPOs
- PWA manifest, generated service worker, app-shell precaching, and offline indicator

## Structure

```text
src/
├─ App.tsx       # Screens, shared form pieces, navigation, and local demo state
├─ i18n.ts       # English/Telugu translation resources and types
├─ index.css     # Responsive visual system and layout styles
└─ main.tsx      # React entry point
public/          # Static PWA assets
vite.config.ts   # Tailwind and vite-plugin-pwa configuration
```

## Scope and limitations

This is a Phase 1 frontend foundation. Authentication is simulated for development review and is not production security. The dashboard cards are placeholders only. Produce listings, buyer offers, market prices, orders, transport requests, AI crop diagnosis, backend authentication, payments, speech services, and full offline synchronization are intentionally not implemented.

The service worker caches the built application shell and static assets after the first successful production load. It does not queue actions or synchronize data. Local storage is limited to language and the non-sensitive demo profile; passwords are never persisted.

## Review flow

1. Open the landing page and switch between English and Telugu.
2. Choose **Start your farmer profile**.
3. Complete the profile and farm information forms, including validation checks.
4. Review the dashboard placeholders.
5. Run `npm run build` and serve `dist` with `npm run preview` to test the production PWA shell.
