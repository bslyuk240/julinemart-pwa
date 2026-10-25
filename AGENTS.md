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
- `src/lib/wordpress/` is dead code (nothing imports it).
- In `src/lib/woocommerce/`, only `products`, `shipping`, `categories`, `policies`, `settings` and `tax-calculator` are live, and they read from Supabase or JLO despite the folder name. `client`, `auth`, `customers`, `orders`, `refunds`, `vendors`, `vendors-custom`, `brands`, `pages` and `test-connection` are dead code. So is `src/app/api/woocommerce/proxy`.
- `NEXT_PUBLIC_WP_URL`, `WC_KEY` and `WC_SECRET` in `.env.production` are leftovers. The only remaining use of `NEXT_PUBLIC_WP_URL` rewrites old absolute links inside policy page HTML.

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
- Gate phone-only UI with `max-md:` / `md:hidden` classes, not JavaScript width checks. The homepage, `/campaigns/*` and the vendor portal are intentionally outside the mobile tier.
- Use `src/components/ui/spinner.tsx` (or `PageLoading`) for loaders, and skeletons where the content's layout is known.
