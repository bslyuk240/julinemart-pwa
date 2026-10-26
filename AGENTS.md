<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# JulineMart storefront: facts every agent needs

Keep this section current. It sits outside the Next.js block above, which `next dev` rewrites; text here is preserved.

## What this is

- The customer storefront for julinemart.com: Next.js 16 (app router). The deploy branch is `stable-production`.
- The Android app is a Capacitor shell that loads the live site (`server.url`), so web changes ship to the app without a store release. Native plugins (e.g. haptics) still need `npx cap sync android`.

## WordPress and WooCommerce are retired

- **WordPress is no longer used.** Don't add WordPress or WooCommerce API calls, and don't tell anyone to "edit it in WordPress".
- The old WordPress/WooCommerce client code has been deleted: `src/lib/wordpress/`, the WooCommerce `client`, `auth`, `customers`, `orders`, `refunds`, `vendors`, `vendors-custom`, `brands`, `pages` and `test-connection` modules, and the `/api/woocommerce/proxy` route. Don't bring them back.
- `src/lib/woocommerce/` now holds only live modules (`products`, `shipping`, `categories`, `policies`, `settings`, `tax-calculator`). They read from Supabase or JLO despite the folder name.
- `WC_KEY` and `WC_SECRET` in `.env.production` are unused leftovers. `NEXT_PUBLIC_WP_URL` is still read in two places: `src/app/page/[slug]/page.tsx` rewrites old absolute links inside policy page HTML, and `scripts/seed-static-pages.mjs` (a one-off import script) uses it.

## Where data lives

| What | Source | Notes |
|---|---|---|
| Sign-in, customers, saved addresses | Supabase (`NEXT_PUBLIC_SUPABASE_URL`) | Supabase Auth. |
| Policy, about and info pages (`/page/[slug]`) | Supabase table `static_pages` (`src/lib/supabase/static-pages.ts`) | `content` is HTML. Edit the rows in Supabase; there is no editor in JLO admin. |
| Banners, sliders, PWA settings | Supabase, via `/api/pwa-settings` | |
| Product catalog | JLO catalog (`NEXT_PUBLIC_JLO_CATALOG_URL`) via `/api/products` and friends | |
| Orders, shipping quotes, payment verification, returns, gift and custom orders | **JLO backend**: repo `julinemart-logistics-orchestrator` (Netlify functions) | Locally `JLO_API_BASE_URL=http://localhost:8888`; start it with `netlify dev` in that repo. JLO writes orders to Supabase. |
| Payments | Paystack inline popup | The storefront holds the public key. JLO verifies with the secret key. Both must be the same account and mode (test or live). |
| Delivery and return couriers | Fez Delivery, booked by JLO | JLO books Fez shipments automatically when an order is paid. |

## The JLO backend repo

JLO (JulineMart Logistics Orchestrator) is this storefront's backend and its admin. When a storefront change needs a backend or admin change, make it there.

- **Local checkout:** `C:\Users\user\julinemart-logistics-orchestrator`. GitHub: `bslyuk240/julinemart-logistics`. It works on its own branches, so check `git branch` before editing and don't switch branches there unasked.
- **API:** about 200 Netlify functions in `netlify/functions/`, e.g. `create-order`, `verify-payment`, `calc-shipping`, `customer-orders`, `fez-*`, `catalog-*` (including `catalog-homepage`), `admin-*`. The storefront calls them through `JLO_API_BASE_URL`, and the catalog through `NEXT_PUBLIC_JLO_CATALOG_URL`.
- **Admin and portals:** the JLO admin (Vite and React, in `src/dashboard/`) is where products, banners, hero ads, campaigns, returns and gift boxes are managed. Homepage sliders and hero ads are edited in `src/dashboard/pages/HomepageContent.tsx`. `vendor-portal/`, `rider-app/`, `customer-portal/` and `influencer-portal/` live there too.
- **Docs:** `SYSTEM_DOCUMENTATION.md`, `API-DOCUMENTATION.md` and `COURIER_INTEGRATION_GUIDE.md` at its root. Its `wordpress-plugins/` and `woocommerce-webhook-setup.php` are retired leftovers.
- **Running it locally:** run `netlify dev` in that folder; it serves on port 8888. Its `.env.local` overrides `.env`, and the Paystack keys there must match the storefront's mode (see below).

## Local development warnings

- Local dev points at the **live** Supabase project. A local test checkout creates a real order row, and once paid, JLO books real Fez shipments. Cancel test orders and their shipments in admin afterwards.
- Local Paystack uses test keys: storefront `.env.local`, and JLO `.env.local`, which overrides JLO's `.env`. Test card: 4084 0840 8408 4081, any future expiry, CVV 408, PIN 0000, OTP 123456.
- Google sign-in on localhost needs `http://localhost:3000` in the web OAuth client's Authorized JavaScript origins.

## Business rules (confirmed by the owner, 2026-10-25)

- **Return postage (Fez waybill on drop-off):** JulineMart pays when the return is our or the vendor's fault (damaged, wrong item, not as described, missing items, suspected counterfeit), using a prepaid return code. The customer pays Fez at drop-off for change-of-mind returns. See `OUR_FAULT_REASONS` in `src/components/return/ReturnRequestForm.tsx`.
- **Refunds:** paid within 7 days once a return is approved.
- **Return destination:** JulineMart's office at No. 9 Jesus is Lord Street, Effurun, Warri. This is intentional, even though Fez's own "Warri Hub" office is a different place.
- **Collections on `/products`:** "Top sellers" is merged into "Best sellers" (`?tag=top-seller` opens Best sellers). "Sponsored" stays for future paid promotion, even while empty.

## UI rules

- Phones get a native-style "mobile tier" UI; see `docs/mobile-tier-plan.md`. Desktop must stay desktop-standard and must not show a phone layout.
- Gate phone-only UI with `max-md:` / `md:hidden` classes, not JavaScript width checks. The homepage joined the mobile tier in M17 (its desktop layout is unchanged). `/campaigns/*` and the vendor portal are intentionally outside it.
- Homepage hero slides, the announcement bar and the side-panel ads are read on the server by `getPwaSettings()` (`src/lib/home/pwa-settings.ts`). Each side panel (`hero_ads.left` / `.right`) may hold one ad object or an array; arrays slide on desktop, and phones show every ad in one carousel mid-page.
- Use `src/components/ui/spinner.tsx` (or `PageLoading`) for loaders, and skeletons where the content's layout is known.
