# JulineMart mobile tier plan

Status: **draft for review**. Nothing here is built yet.
Date: 2026-10-18 (revised the same day: Home removed from the redesign, design previews added as a gate before any build)

Design previews: `design/mobile-tier/index.html` (static phone mockups of every wave-1 screen). No app code changes until you approve them.

## 1. Goal

Give phone users (mobile web, the installed PWA and the Android app) a storefront that feels like a native shopping app. We roll it out one page at a time. Desktop stays exactly as it is today.

Ground rules (from the existing responsive standard):

- Desktop stays desktop-standard. **No phone-width column on desktop, ever.**
- Mobile stays mobile-standard. A mobile-tier page must not look like a squeezed desktop page.
- Same URLs, same SEO, one codebase, one deploy.

---

## 2. How the app works today

| Area | Today | What it means for this plan |
|---|---|---|
| Framework | Next.js **16.3.5**, App Router, React 19.2, Tailwind **3.4**, Zustand, TanStack Query | `<ViewTransition>` and `Link transitionTypes` (16.2+) are available. No animation library is needed. |
| Root layout | `src/app/layout.tsx`: providers, then `GlobalPullToRefresh`, then `ConditionalChrome` (Header + `<main>` + Footer + BottomNav). Campaign routes skip the chrome. | `ConditionalChrome` is already a per-route chrome switch, so it is the natural place to plug in a mobile shell. |
| Header | `layout/header.tsx` (288 lines, client). It holds the logo, search with live results, cart, hamburger menu, and the announcement banner fetched on mount. One component serves every breakpoint. | Mobile has no screen-specific top bar: no back button and no page title, just the same header on every page. |
| Bottom nav | `layout/bottom-nav.tsx`, loaded `ssr:false`, `md:hidden`, `z-[60]`. Tabs: Home / Categories / Cart / Wishlist / Account. The active tab uses an **exact** pathname match. | It pops in after hydration (a layout shift). `/account/orders` does not highlight Account. |
| Breakpoints | Tailwind defaults. Roughly 841 `md:`, 143 `sm:`, 84 `lg:`, 17 `xl:` uses. `md` (768px) is the de facto mobile/desktop line. `.container-custom` = `max-w-7xl px-4 sm:px-6 lg:px-8`. | **Mobile tier = below `md`.** Tablets at 768px and up keep the desktop layout. |
| Device detection | No UA detection. `matchMedia` is used only in PWA prompts and pull-to-refresh. | Good: no server-side device split exists to unwind. |
| Rendering | Home and PDP are server components with `revalidate = 300` (ISR). PDP has `generateMetadata`. Cart, checkout (2,282 lines), category, products and the gift builder (1,173 lines) are full `'use client'` pages. | Any approach that varies HTML per device breaks ISR and CDN caching. |
| Proxy | `src/middleware.ts` handles rate limiting. Next 16 deprecates the name in favour of `proxy.ts`. | Out of scope here, but we should not add device logic to it (see §3). |
| Capacitor | `capacitor.config.ts`: `server.url = https://julinemart.com`. The Android app is a **WebView of the live site**. Plugins: app, browser, push-notifications, SystemBars (`insetsHandling: 'css'`). `StatusBarManager` paints the status bar white. | **Web deploys reach app users immediately with no Play Store release.** Only new native plugins (haptics etc.) need a new build. |
| Native glue | `src/components/native/`: status bar and push only. The Android back button is not handled, apart from the Google sign-in flow. | Back behaviour is whatever the WebView does by default. Open sheets and modals do not close on back. |
| Safe areas | `viewportFit: 'cover'`, `interactiveWidget: 'resizes-content'`, `.safe-*` utilities, a `--jm-vv-bottom-inset` visual-viewport sync, and `<main>` bottom padding for nav clearance. | The foundation exists. It needs to become tokens. |
| Existing sheet | `gifts/gift-builder-customise-sheet.tsx` is a hand-rolled bottom sheet (`fixed inset-0 items-end`). | It becomes the first consumer of a shared `Sheet` primitive. |
| Pull to refresh | Global, does a full `location.reload()`, disabled on `/vendor` and the gift flow. | It must also stand down while a sheet is open or an inner scroller is active. |
| Overlays | Toaster, PWA install prompt, notification prompt, cookie banner and the support chat widget all float. The z-index values are ad hoc (`z-50`, `z-[60]`…). | They will collide with sticky buy bars and sheets unless we define a z-scale. |

---

## 3. Architecture options

| Option | How | SEO / SSR | Caching (ISR) | Codebase | Verdict |
|---|---|---|---|---|---|
| **A. Separate mobile routes** (`/m/...` or proxy rewrite by UA) | `proxy.ts` reads `userAgent().device.type` and rewrites to a parallel mobile tree. | Duplicate URLs need canonical/alternate handling. Googlebot is mobile-first, so it would index the mobile tree. | Per-device cache keys. A Netlify cache keyed on UA is fragile. | Two page trees drift apart. | ❌ Too costly and too risky. |
| **B. Server device split, same URL** | Read `headers()`/UA in the page and render `<MobilePage>` or `<DesktopPage>`. | OK. | Reading headers makes the page dynamic, so we lose `revalidate = 300` on home and PDP. UA misdetects (tablets, desktop-mode Chrome) show the wrong layout. | Two components per page. | ❌ Breaks ISR and gets the wrong layout on misdetection. |
| **C. Client device split** | `useIsMobile()` after hydration swaps component trees. | SSR HTML is one variant, so you get a flash or CLS on the other. | OK. | Two trees. | ❌ Hydration mismatch and CLS. |
| **D. One tree, mobile shell plus CSS-gated mobile pieces** ✅ | Same route and same server component. A **mobile shell** replaces Header/BottomNav below `md` on opted-in routes. Each page composes shared sections plus a few **mobile-only** pieces (`md:hidden`) and **desktop-only** pieces (`hidden md:block`). Native behaviour is added through Capacitor when `window.Capacitor` exists. | Best. One URL, one HTML document, full SSR. | Unchanged. The HTML is identical for every device. | One tree, shared data and hooks. | ✅ **Recommended** |

### Recommendation: option D, "one tree, mobile shell, CSS-gated"

**Layering**

```
src/
  lib/mobile/                 # pure helpers, no UI
    platform.ts               # isNativeApp(), isStandalonePWA(); runtime checks, never used for layout
    haptics.ts                # tap/selection/success/warning → @capacitor/haptics | navigator.vibrate | no-op
    back-stack.ts             # Android back: close top overlay → router.back() → exit app on root tab
    mobile-tier-routes.ts     # allowlist of routes that use the mobile shell (the rollout switch)
  components/mobile/
    shell/                    # MobileShell, MobileTopBar (large-title and compact), TabBar, StickyActionBar
    primitives/               # Sheet, ActionSheet, SegmentedControl, ListRow, Stepper, Skeleton, PressableCard, Toast slot
    transitions/              # route slide/fade via React <ViewTransition> + CSS
  hooks/                      # existing data hooks (use-cart, use-products, …) stay shared
```

**Rules**

1. **Layout is decided by CSS, never by JS.** Mobile pieces carry `md:hidden` and desktop pieces carry `hidden md:*`. No `useIsMobile()` decides what renders. JS media queries may only decide *behaviour* after mount, e.g. "open a sheet" vs "open a dropdown".
2. **Split only what differs.** Shared leaf components (ProductCard, price, gallery images, CartItem data) render once. Duplicate a section only when the mobile and desktop structure really differ (top bar, buy bar, filter UI). Stateful flows (checkout, gift builder) must **never** render two copies of a form. They keep one form and change *its layout* with responsive classes, with mobile-only chrome around it.
3. **Data and hooks stay shared.** Server fetchers (`getProductBySlug`, `getHomepageSectionsData`) and client hooks (`use-cart`, `use-wishlist`, TanStack Query) are reused as-is. The mobile tier adds no new data paths.
4. **Opt-in per route.** `ConditionalChrome` consults `mobile-tier-routes.ts`. Routes on the list get `MobileShell` below `md` and the current Header/Footer at `md` and up. Routes not on the list are untouched. Rolling a page back means one line in that list.
5. **Native is progressive enhancement.** Haptics, the hardware back button and the status bar colour act only when `window.Capacitor` exists (same guard as `StatusBarManager`). The web and PWA get web fallbacks or nothing.
6. **Overlays are portalled and mounted on open.** Sheets and action sheets are not in the SSR HTML, so they cost nothing up front.

**Tradeoffs**

| Concern | How D handles it |
|---|---|
| SEO / SSR | One URL, one HTML, unchanged metadata and JSON-LD. Mobile-first indexing sees real content, because the mobile pieces are in the SSR HTML. |
| ISR / CDN | No per-device output, so `revalidate = 300` and Netlify caching keep working. |
| Single codebase | Yes. The mobile tier is a shell plus primitives plus per-page composition, not a fork. |
| Play Store build | The UI ships with normal Netlify deploys, because the app loads the live site. **One** Play Store release is needed early (M0) to add `@capacitor/haptics` (and optionally `@capacitor/keyboard`). After that, page waves need no store releases. Native calls stay feature-detected, so old app installs degrade gracefully. |
| Desktop standard | Desktop pieces are untouched, and mobile pieces are `md:hidden`, so a phone-width column can't leak onto desktop. Each milestone includes a desktop screenshot check at 1280px and 1440px. |
| Cost | There is some extra DOM where sections are duplicated. Mitigation: duplicate only small chrome (top bar, buy bar, filter trigger) and never product grids or forms. Track HTML size per route (budget in §7). |

**Not chosen, and why:** a separate React Native/Expo app (a second codebase, and every change ships through the stores) and Ionic/Framework7 (a heavy runtime that would fight Tailwind and the existing components). Both are worth revisiting only if the WebView ever becomes the bottleneck.

---

## 4. Mobile shell: native patterns

| Pattern | Spec | Implementation notes |
|---|---|---|
| **Top bar** | Root tabs (Home, Categories, Cart, Wishlist, Account) get a large-title bar (title 28px) that collapses to a 56px compact bar on scroll. Pushed screens (PDP, category, order detail) get a compact bar with back, title and up to 2 actions. | CSS `position: sticky` plus an IntersectionObserver sentinel for the collapse. Back uses `router.back()` when there is in-app history and the route's logical parent otherwise. The search field on listing screens is tappable and opens a full-screen search screen. |
| **Tab bar** | 5 tabs, 56px plus the bottom safe area. The icon is filled when active. Badges on Cart and Wishlist. Re-tapping the active tab scrolls to top. **Prefix** active matching. Hidden on checkout and inside flows. | Render it in SSR (drop `ssr:false`) with badges filled after hydration, so it no longer pops in. |
| **Sticky action bar** | A bottom bar for the page's primary action (Add to cart / Buy now, Checkout, Continue). It sits above the tab bar, or replaces it on flow screens. | One component. It reserves its height through a `--m-bottom-stack` CSS variable, so content, toasts and the chat bubble can offset. |
| **Bottom sheet** | Grabber, drag-to-dismiss, snap points (half/full), scrim, focus trap. Back and Escape close it. Body scroll is locked. | Use it for the variant picker, filters/sort, share, gift customise, address picker. Pull-to-refresh is disabled while a sheet is open. |
| **Action sheet** | A list of actions plus Cancel, used for share, remove item and sort quick-pick. | Built on top of Sheet. |
| **Route transitions** | Push slides in from the right, pop slides back, tab switches crossfade, PDP image morphs from the card thumbnail. | React `<ViewTransition>` plus `<Link transitionTypes={['push'|'pop']}>` (Next 16.2+). The CSS for `::view-transition-*` sits inside `@media (max-width: 767px)` and `prefers-reduced-motion: no-preference`, so desktop never animates. Unsupported browsers simply don't animate. |
| **Back gesture** | Android uses the system back gesture or button: close the top overlay, then go back, then on a root tab go to Home, then exit. iOS PWA/Safari keeps the browser's edge swipe. | `@capacitor/app` `backButton` listener plus an overlay stack in `back-stack.ts`. We **don't** build a custom edge-swipe in the WebView, because it fights the Android system gesture. |
| **Pull to refresh** | Keep it on list and root screens. Replace the full reload with `router.refresh()` plus query invalidation where the page supports it. | Revisit later. Out of scope for M0. |
| **Haptics** | Light tap on tab change and stepper, selection on variant pick, success on add-to-cart and order placed, warning on validation error. | `@capacitor/haptics` in the app, `navigator.vibrate(10)` on Android web, a no-op elsewhere. Respect a future "reduce haptics" setting. |
| **Press feedback** | Pressed state = scale 0.98 + darken, 100ms. No hover-only affordances on mobile. | `active:` utilities plus `@media (hover:hover)` guards for hover styles. |
| **Skeletons** | Every mobile screen gets a shape-matched skeleton, with no spinners on first load. | Reuse the home skeleton pattern. Use `loading.tsx` per route where it helps. |
| **Keyboard** | Inputs never sit under the keyboard. The sticky bar hides while the keyboard is open. | `interactiveWidget: 'resizes-content'` already set. Optionally add `@capacitor/keyboard` in M0. |

---

## 5. Mobile design system (v1)

These are tokens, defined once as CSS variables in `globals.css` under a `--m-` prefix and exposed through `tailwind.config.ts` `theme.extend`. They apply only to mobile-tier components. Existing brand colours stay (`primary` #77088a, `secondary` #ff7a29).

### Spacing (4pt grid)

| Token | px | Use |
|---|---|---|
| `m-1` | 4 | icon-to-label |
| `m-2` | 8 | inside chips, tight stacks |
| `m-3` | 12 | card padding, list row vertical |
| `m-4` | **16** | **screen gutter** (constant on mobile) |
| `m-5` | 20 | between related groups |
| `m-6` | 24 | between sections |
| `m-8` | 32 | major section breaks |

Screen gutter is always 16px. Horizontal carousels bleed to the edge, with the first card inset 16px.

### Type scale (Inter)

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `m-display` | 28 / 34 | 700 | large title on root tabs |
| `m-title` | 20 / 26 | 700 | screen title (compact bar 17/22 semibold) |
| `m-headline` | 17 / 22 | 600 | section headers, product name on PDP |
| `m-body` | **16 / 22** | 400 | body text. **All inputs are 16px or larger** (prevents iOS zoom) |
| `m-callout` | 15 / 20 | 400–600 | list rows, buttons |
| `m-subhead` | 14 / 19 | 400 | secondary text, card titles |
| `m-footnote` | 13 / 18 | 400 | meta, ratings |
| `m-caption` | 12 / 16 | 500 | badges, tab labels (11 is the floor) |
| `m-price` | 18 / 22 | 700, tabular-nums | prices; strikethrough at `m-footnote` |

### Touch targets

- **48×48px minimum** hit area (Material). Small icons get padding to reach it.
- At least 8px between adjacent targets.
- Primary buttons: height 48, radius 12, full-width in sticky bars.
- Tab bar items: at least 56px tall, full column width.
- List rows: at least 56px (72px with a subtitle).

### Shape and elevation

- Radius: 8 (chips), 12 (cards, buttons), 16 (images on PDP), 24 (sheet top corners).
- Elevation: e0 flat, e1 card (`0 1px 2px` + hairline), e2 sticky bars (`0 -2px 12px rgb(0 0 0 / .06)`), e3 sheets (scrim `rgb(0 0 0 / .4)`).
- **Z-scale** (replaces ad hoc values): content 0, sticky header 30, tab bar / action bar 40, floating widgets (chat, toasts) 50, scrim 60, sheet 70, system prompts (cookie, install) 80.

### Motion

| Token | Duration | Easing | Use |
|---|---|---|---|
| `m-fast` | 120ms | `cubic-bezier(.2,0,0,1)` | press, toggle, badge |
| `m-base` | 220ms | `cubic-bezier(.2,0,0,1)` | crossfade, collapse |
| `m-push` | 300ms | `cubic-bezier(.05,.7,.1,1)` enter / `(.3,0,.8,.15)` exit | route push/pop, sheet open |
| `m-sheet-close` | 200ms | accelerate | sheet dismiss |

- Animate only `transform` and `opacity`.
- `prefers-reduced-motion: reduce` turns slides into 120ms fades and removes the morph.
- No new JS animation library. Lottie (already a dependency) is for celebrations only.

### Safe areas

`--m-safe-top/bottom/left/right` map to the existing `--safe-area-inset-*` / `env()` fallbacks. `--m-bottom-stack` holds the tab bar plus any sticky bar plus the safe area plus `--jm-vv-bottom-inset`. Everything that floats bottom-aligned (toasts, chat bubble, install prompt) offsets by it.

---

## 6. Rollout waves

> Ranking is based on funnel position and current UX gaps. **Before M1, confirm it with GA4 data** (sessions by landing page, mobile share, add-to-cart rate per page).

### Wave 1: core shopping funnel

**Home is out of scope.** You're happy with the current homepage, so its content and layout stay exactly as they are. The only thing it shares with the mobile tier is the site-wide bottom navigation bar (see open question 6).

| # | Page(s) | Why it's first | Mobile-tier changes |
|---|---|---|---|
| 1 | **Product detail** `/product/[slug]` | Highest-intent page, and the main landing page from ads, WhatsApp and social shares. It currently has **no sticky buy bar**: Add to cart scrolls away. | Compact top bar (back, share, cart). Full-bleed swipe gallery with dots and a thumbnail morph from the card. Sticky buy bar (price + Add to cart + Buy now). Variant/qty in a bottom sheet. Collapsible sections (description, specs, warranty, vendor, reviews). The server component and `generateMetadata` are unchanged. |
| 2 | **Listing and search**: `/category/[slug]`, `/products`, `/search` | The browse path between Home and PDP. Filters and sort are the classic mobile pain point. | Compact bar with the category title. A sticky filter/sort row that opens bottom sheets. 2-column grid with consistent cards. Infinite scroll with skeletons. The search screen gets recent searches, suggestions and a results list. |
| 3 | **Cart → Checkout** `/cart`, `/checkout` | Conversion. Cart is small (79 lines) and quick to do. Checkout is the riskiest page (2,282 lines, payments). | Cart: swipe-to-remove or an action sheet, qty stepper, sticky "Checkout ₦X" bar. Checkout: **layout-only** this wave. One form with mobile sections (address, delivery, payment, review) as stacked cards, a sticky "Pay ₦X" bar, and the tab bar hidden. No logic changes. Splitting checkout into steps is wave 3. |

### Wave 2: retention and gifting

- **Gift builder** `/gifts/build`. It already has a 4-step stepper and persisted progress, so it maps well onto native step screens with a sticky Continue bar and the existing customise sheet moved onto the shared `Sheet`. It's ranked below wave 1 only on traffic. If gifting is the current marketing push, swap it with listing/search.
- `/gifts`, `/gifts/[occasion]`, `/gifts/boxes`, `/gifts/checkout`
- Account hub `/account` as a settings-style list, plus orders list and order detail `/orders`, `/orders/[id]`, `/account/orders`
- `/wishlist`, `/categories` (root tab: icon grid to a list or grid)

### Wave 3: the long tail and flow polish

- Checkout split into native steps, with Paystack sheet handling
- Login, forgot and reset password, and Google sign-in (Capacitor browser flow already exists)
- `/brand/[slug]`, `/brands`, vendor stores, `/order-success` (success haptic + Lottie)
- Account sub-pages (addresses, payments, returns, notifications, settings), `/contact`, `/page/[slug]`
- Pull-to-refresh moved to `router.refresh()`
- **Excluded:** `/` (Home, kept as it is), `/campaigns/*` (has its own chrome by design) and `/vendor*` (its own app area)

---

## 7. Milestones

Each milestone ends with: mobile screenshots at 360×800 and 390×844, **desktop screenshots at 1280 and 1440 showing no change**, a test in the Android app build, and a Lighthouse mobile run. Nothing ships to `stable-production` without your review.

| Milestone | Scope | Exit criteria | Needs a Play Store build? |
|---|---|---|---|
| **D: Design previews** | Static phone mockups for every wave-1 screen (`design/mobile-tier/`), plus a critique pass. | **You approve the mockups.** Nothing below starts before that. | No |
| **M0: Foundations** | Tokens (`--m-*`, Tailwind extension, z-scale). `lib/mobile/*` (platform, haptics, back-stack, route allowlist). `MobileShell`, `MobileTopBar`, SSR `TabBar` with prefix matching, `StickyActionBar`, `Sheet`/`ActionSheet`. View-transition CSS. Android back-button handling. Add `@capacitor/haptics` (+ optionally `@capacitor/keyboard`) and cut **one** app release. `ConditionalChrome` reads the allowlist, which starts empty. | Allowlist empty, so production is pixel-identical. Primitives demoed on a dev-only route. Back button closes sheets in the app. | **Yes, once** |
| **M1: PDP** | Wave 1 #1 | Sticky buy bar works with variants. Add-to-cart haptic works in the app. No CLS regression. | No |
| **M2: Listing + search** | Wave 1 #2 | Filter/sort sheets work, back closes them, URL state preserved | No |
| **M3: Cart + checkout layout** | Wave 1 #3 | A test payment completes end-to-end in a browser **and** in the app. Paystack popup/redirect is unaffected. | No |
| **M4: Wave 2** | Gift builder first, then gifts, account/orders, wishlist, categories | Same checks as above | No |
| **M5: Wave 3** | Checkout steps, auth, long tail | Same checks as above | Maybe (if more plugins are needed) |

**M0 status (2026-10-18): built, not committed.**

- Tokens: `--m-*` in `globals.css` and `m-*` in Tailwind.
- `src/lib/mobile/` holds platform, haptics, back-stack, nav-history, tabs and the route allowlist, with tests.
- `src/components/mobile/` holds `MobileTopBar`, the SSR `TabBar`, `StickyActionBar`, `Sheet` and `ActionSheet`.
- `ConditionalChrome` now reads the allowlist. It's empty in production, so no page changes.
- The Android Back handler is in `components/native/native-back-button.tsx`.
- Pull-to-refresh stands down while a sheet is open, and the chat bubble follows `--m-float-bottom`.
- There is a dev-only demo at `/dev/mobile-shell`, which returns 404 in production.

Still open from the M0 scope:
- **(a)** The Play Store release with `@capacitor/haptics` still needs to be cut: `npm run cap:sync`, then build in Android Studio.
- **(b)** Route view transitions move to M1, because they need per-page `<ViewTransition>` boundaries.
- **(c)** Closing sheets with the browser's Back on the web (outside the app) is deferred until we confirm it works safely with the Next router's history.
- **(d)** The cookie banner and install prompt aren't on the new z-scale yet.

**M1 status (2026-10-18): built, not committed.**

`/product/*` is on the allowlist. Below `md`, the product page has:
- the overlay top bar (back, share sheet, cart badge)
- a full-bleed swipe gallery with a counter
- Material option chips with a selection haptic
- a pinned buy bar (wishlist / Add to cart / Buy now) instead of the inline buttons
- "Add to cart" before choosing options scrolls to the options and gives a warning haptic
- a success haptic plus a "View cart" toast after adding
- the description collapsed behind "Read more"

Everything is gated on `useMobileTier()` plus `md:hidden` / `max-md:`, so desktop is unchanged and removing the route reverts the page. The Android project was synced with `@capacitor/haptics` (`npx cap sync android`). `npm run build` currently fails locally while prerendering `/` (ECONNREFUSED fetch), which is unrelated to this work.

Polish pass done:
- Delivery, Protect (links to the terms page) and 3-day returns (links to `/page/refund_returns`) are list rows, via `ProductFeatures variant="list"`.
- A review summary shows the average, the count and 5→1 bars, with "See all" opening the Reviews tab.
- The seller card shows a store avatar, the trust badge and a "Visit store" button.
- On the mobile tier these replace the Protect card, the feature tiles and the seller box. Desktop keeps the originals.

**M2 status (2026-10-18): built, not committed.**

`/category/*` (with the navigation bar) and `/search` (full-screen, no navigation bar) are on the allowlist.

Category listing below `md`:
- a compact top bar (back to /categories, search)
- a sticky chip row: sort, filters, "In stock", "Under ₦20,000"
- a sort sheet (radio rows)
- a filter sheet: price fields and presets, an in-stock switch, sellers, and a live "Show n results" count
- Material product cards (`ProductCard mobileTier`); Home and every other caller keep the current card
- a skeleton instead of the spinner, and infinite scroll

Search below `md` has its own search field, live product matches while typing, "Search for …", and recent searches (stored per device). Desktop is unchanged on both pages.

Follow-ups:
- The catalog API ignores `min_price` / `max_price` / `stock_status`, so filters run client-side over up to 5 loaded pages. Real server-side filtering belongs in JLO's catalog-products.
- `/products` and `/categories` are not on the tier yet. Moving between tier and non-tier pages switches between the new and old navigation bars (open question 6).

**M3 status (2026-10-18): built, not committed.**

`/cart` (with the navigation bar) and `/checkout` (without it) are on the allowlist.

Cart below `md`:
- a "Cart · n items" top bar
- free-delivery progress, shown only while JLO has a live offer with a minimum
- items grouped by seller with Material steppers; − turns into a bin at quantity 1, with haptics
- a sticky "Subtotal · Checkout" bar above the navigation bar

Checkout is **layout only**. It keeps the same form, handlers and readiness checks, and adds a top bar with "Secure" and a pinned "Pay ₦total" (or "Retry payment") button that calls the same `handlePlaceOrder` / retry path. The summary card's own buttons are hidden on phones. Desktop is unchanged on both pages.

Still to verify by hand: a real Paystack test payment end to end, in a browser and in the Android app. That needs a filled form, a working JLO shipping quote and Paystack test keys.

Deferred to the wave 3 checkout rework, since they need logic changes:
- the mockup's delivery/pickup segmented switch
- the "Deliver to" summary card
- per-seller shipment rows
- moving the install prompt and cookie banner onto the new overlay layering (they still cover the screen)

**Performance budgets (mobile, per route):** no more than +15KB gzipped JS over today's route, no more than +10% HTML size, CLS ≤ 0.05, LCP on a mid-range Android over 4G no worse than the current baseline (measure it in M0).

---

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Desktop regression** from shared components picking up mobile styles | Med | Mobile-only styling lives in `components/mobile/` or behind `md:hidden`. Desktop screenshot diff at every milestone. |
| **Duplicate DOM** (two copies of a section) inflates HTML or causes duplicate IDs and forms | Med | Rule 2 in §3: never duplicate forms or grids. Lint or grep for duplicate `id=`. HTML-size budget. |
| **ISR/caching broken** by someone adding `headers()`/`cookies()` for device logic | Low–Med | Rule 1 plus a code review checklist item: no request-time device reads in pages. |
| **Overlay collisions**: chat widget, toasts, cookie banner and install prompt overlap the sticky bar or sheets | High | Z-scale plus `--m-bottom-stack` offset in M0, with every floating widget migrated to it. |
| **Pull-to-refresh vs sheets and inner scrollers** (an accidental reload loses state, as already seen in the gift builder) | High | PTR stands down while a sheet is open or an inner scroller isn't at the top. Move PTR to soft refresh later. |
| **Android back** exits the app or skips past open sheets | High today | `back-stack.ts` in M0, tested on a device. |
| **Old app installs** lack the haptics plugin | Certain for a while | Feature-detect every native call. They're a no-op without it. |
| **View Transitions support** on older Android System WebView or iOS Safari | Low | Pure progressive enhancement: no animation, no breakage. The CSS is gated to mobile and to no reduced-motion preference. |
| **Low-end devices and data cost** (a big part of Nigerian traffic) | Med | CSS-only motion, no new animation library, sheets mounted on demand, images keep `next/image` sizes, budgets enforced. |
| **Checkout/payment regression** | Med (high impact) | Wave 1 checkout is layout-only. Full payment test in browser and app before merge. Step-split deferred to wave 3. |
| **Scope creep / long-lived branch drift** with another session touching the same files | Med | Small per-milestone PRs. Route allowlist means each page can merge dark and switch on later. |
| **Ranking is wrong** (traffic differs from assumptions) | Med | GA4 check before M1. Waves are reorderable because the shell is page-agnostic. |

---

## 9. Open questions for review

1. Should the **gift builder** move into wave 1 because of the gifting push?
2. Tab bar: keep **Wishlist** as a tab, or swap it for **Gifts** or **Search**?
3. Is a **Play Store release** in M0 acceptable (for haptics/keyboard), or should native plugins wait?
4. **Tablets** (768–1023px): keep the desktop layout (this plan's default), or give them the mobile shell?
5. Can I get **GA4 access** (or an export) to confirm the page ranking before M1?
6. The navigation bar is shared by every page, including Home. Should the Material-style bar from the mockups replace the current one **everywhere** (Home included), or only on mobile-tier pages?
