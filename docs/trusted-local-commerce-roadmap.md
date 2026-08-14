# JulineMart — Trusted Local Commerce Roadmap

Positioning anchor:

> **JulineMart — Nigeria's marketplace for trusted local businesses.**

This roadmap turns the differentiation strategy into a sequenced build plan across **`julinemart-pwa`** (customer storefront), **`julinemart-logistics-orchestrator`** (JLO — ops, logistics, admin), and **`vendor-portal`** (seller tools inside JLO).

**Out of scope for this roadmap (handled separately or deferred):**
- **#21 Delivery transparency** — largely built; polish only
- **#22 Seller-controlled delivery** — JLO ops config exists; customer-facing choice deferred to Phase 2B
- **#32 Handmade marketplace layer** — minimal tags only here; full layer belongs to JulineService
- **#35 Group / corporate purchasing** — deferred; starts from Request a Quote in Phase 5

**Already built (extend, don't rebuild):**
- Vendor storefronts (`src/app/vendor/[id]/page.tsx`)
- Campaign landing pages (`src/app/campaigns/[slug]/page.tsx`)
- Order tracking (`src/components/orders/order-status-tracker.tsx`)
- Returns + refund backend (JLO `return_requests`, PWA `src/lib/jlo/returns.ts`)
- Distributed fulfilment (JLO order splitting, hub dispatch, vendor dispatch)
- Approved vendor locations (JLO `approved_vendor_locations`)

---

## How to read this doc

| Column | Meaning |
|---|---|
| **Repo** | PWA = customer app · JLO = orchestrator/admin · VP = vendor portal |
| **Weeks** | Rough effort for a small team; parallelise where dependencies allow |
| **Exit gate** | Must pass before starting the next phase |

---

## Phase 0 — Quick wins & integrity fixes (Week 1–2)

**Goal:** Stop trust damage from placeholder UI; ship visible Protect messaging; lay schema foundations.

### 0.1 Remove fake seller metrics (urgent)

| Task | Repo | File / area |
|---|---|---|
| Replace hardcoded `95% Positive` and `24h Response` with real data or hide until real | PWA | `src/app/vendor/[id]/page.tsx` |
| Extend vendor API to return computed metrics (or `null`) | PWA | `src/app/api/vendor/[id]/route.ts` |

**Exit:** No fabricated numbers on any customer-facing page.

### 0.2 JulineMart Protect — display layer

| Task | Repo | File / area |
|---|---|---|
| Define protection policy doc (eligible orders, exclusions, custom products later) | Ops/Legal | internal doc |
| `JulineMartProtectBadge` component | PWA | `src/components/trust/` (new) |
| Show beside Add to Cart on PDP + checkout summary | PWA | `src/components/product/product-detail-page.tsx`, checkout |
| Order meta flag `jlo_protect_eligible` (default true for verified sellers) | JLO | order create pipeline |

**Schema:** none required for v1 (policy + UI only).

### 0.3 Minimal local-maker discovery

| Task | Repo | File / area |
|---|---|---|
| Add product tags: `handmade`, `made-in-nigeria`, `customisable` | PWA | `src/lib/constants.ts`, filters |
| Homepage curated rail “Local Makers” (tag-driven) | PWA | `src/lib/homepage-sections.ts` |
| Optional link to JulineService for service bookings | PWA | config URL only |

### 0.4 Shared types scaffold

| Task | Repo | File / area |
|---|---|---|
| Create shared trust types (mirror campaigns pattern) | Both | `src/types/trust.ts` in PWA + JLO |

```typescript
// src/types/trust.ts (sketch)
export type VerificationLevel = 1 | 2 | 3 | 4 | 5;
export type VerificationType =
  | 'identity'
  | 'phone'
  | 'bank_account'
  | 'business_registration'
  | 'physical_store'
  | 'trusted_seller'
  | 'julinemart_assured';

export type SellerVerification = {
  vendor_id: string;
  level: VerificationLevel;
  verifications: VerificationType[];
  verified_at?: string;
  metadata?: Record<string, unknown>;
};

export type SellerPerformanceMetrics = {
  successful_orders: number;
  fulfilment_rate: number;       // 0–100
  product_accuracy: number;
  on_time_dispatch: number;
  response_rate: number;
  avg_response_minutes: number;
  dispute_rate: number;
  repeat_customer_rate: number;
};
```

**Phase 0 exit gate:** Protect badge live on PDP · fake metrics gone · trust types in both repos · maker tags filterable.

---

## Phase 1 — Trust Foundation (Week 3–8)

**Goal:** Verifiable sellers, real performance data, structured problems/refunds, physical store trust.

**Positioning unlocked:** *“Buy from verified Nigerian businesses, protected by JulineMart.”*

### 1.1 Database — seller trust (Supabase, shared)

**Migration file:** `supabase/migrations/YYYYMMDD_seller_trust.sql`

```sql
-- seller_verifications: one row per verification type per vendor
CREATE TABLE seller_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN (
    'identity', 'phone', 'bank_account', 'business_registration',
    'physical_store', 'trusted_seller', 'julinemart_assured'
  )),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  evidence jsonb DEFAULT '{}',
  verified_by uuid,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (vendor_id, verification_type)
);

-- seller_performance_snapshots: nightly or on-demand rollup
CREATE TABLE seller_performance_snapshots (
  vendor_id uuid PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
  successful_orders int DEFAULT 0,
  fulfilment_rate numeric(5,2),
  product_accuracy numeric(5,2),
  on_time_dispatch numeric(5,2),
  response_rate numeric(5,2),
  avg_response_minutes int,
  dispute_rate numeric(5,2),
  repeat_customer_rate numeric(5,2),
  computed_at timestamptz DEFAULT now()
);

-- Extend approved_vendor_locations for public store profile
ALTER TABLE approved_vendor_locations ADD COLUMN IF NOT EXISTS
  public_area text,
  store_photos jsonb DEFAULT '[]',
  opening_hours jsonb,
  supports_customer_pickup boolean DEFAULT false,
  pickup_instructions text;
```

### 1.2 Admin — verification workflow

| Task | Repo | Notes |
|---|---|---|
| Admin UI: approve/reject verifications with evidence upload | JLO | new page `SellerVerifications.tsx` |
| API: `POST /admin/seller-verifications`, `PATCH .../approve` | JLO | netlify function |
| Vendor onboarding checklist (identity → business → store) | VP | extend `Register.tsx` / new `Verification.tsx` |
| Trusted Seller + Assured: auto-eligible when metrics thresholds met | JLO | cron or nightly job |

**Verification levels (customer-facing):**

| Level | Name | Requirements |
|---|---|---|
| 1 | Identity Verified | identity + phone + bank |
| 2 | Verified Business | + business registration |
| 3 | Physical Store Verified | + approved location + photos |
| 4 | Trusted Seller | + order volume, fulfilment, low disputes |
| 5 | JulineMart Assured | + manual review + Protect extended coverage |

### 1.3 PWA — trust display

| Surface | Component | Data source |
|---|---|---|
| Vendor page header | `SellerTrustBadge` | `GET /api/vendor/[id]/trust` |
| PDP “Sold by” block | verification chips + order count | same |
| Search/filter | “Verified sellers only” toggle | catalog query param |

**New API:** `GET /api/vendor/[id]/trust` → `{ level, verifications[], metrics }`

### 1.4 Real seller performance metrics

| Task | Repo | Notes |
|---|---|---|
| Nightly job: compute metrics from orders, returns, reviews, support | JLO | `compute-seller-metrics.js` |
| Backfill snapshot table | JLO | one-off script |
| Vendor page + API consume snapshots | PWA | replace Phase 0 placeholders |

**Metrics source tables:** `orders`, `sub_orders`, `return_requests`, `product_reviews`, `support_conversations`

### 1.5 Structured dispute resolution (extend returns)

**Don't build a parallel system.** Extend `return_requests`:

```sql
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS
  complaint_type text CHECK (complaint_type IN (
    'not_received', 'wrong_product', 'damaged', 'not_as_described',
    'missing_items', 'suspected_counterfeit', 'other'
  )),
  evidence_urls jsonb DEFAULT '[]',
  seller_response text,
  seller_responded_at timestamptz,
  resolution_timeline jsonb DEFAULT '[]';
```

| Task | Repo | Notes |
|---|---|---|
| “Report a problem” with typed complaints + photo upload | PWA | extend `ReturnRequestForm.tsx` → `ProblemReportForm.tsx` |
| Customer-visible timeline: Submitted → Seller responding → Review → Decision | PWA | new component on order detail |
| Vendor can respond with evidence | VP | extend `Returns.tsx` |
| Admin mediation view | JLO | extend `Returns.tsx` dashboard |

### 1.6 Transparent refund tracking (UX on existing backend)

| Task | Repo | Notes |
|---|---|---|
| Refund timeline component: Approved → Sent to provider → Completed | PWA | `RefundTimeline.tsx` |
| Show amount, method, initiated date, expected window (3–5 bank days) | PWA | `src/app/account/returns/page.tsx`, order detail |
| Persist `refund_initiated_at`, `refund_expected_by` on return | JLO | extend returns queue |

**Phase 1 exit gate:**
- [ ] 10+ sellers with at least Level 1 verification displayed
- [ ] Vendor page shows real metrics (no placeholders)
- [ ] Customer can submit typed complaint with photos
- [ ] Refund status shows timeline with expected date
- [ ] Protect badge shows eligibility reason

---

## Phase 2A — Local commerce & retention (Week 9–12)

**Goal:** Relationship commerce — follow stores, pickup, reorder, offline QR bridge.

**Positioning unlocked:** *“Stay connected to shops you trust — online and offline.”*

### 2A.1 Follow a store

**Migration:**

```sql
CREATE TABLE store_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,          -- Firebase UID
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  notify_new_products boolean DEFAULT true,
  notify_promotions boolean DEFAULT true,
  notify_restock boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, vendor_id)
);

CREATE TABLE store_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  type text CHECK (type IN ('new_product', 'promotion', 'restock', 'collection')),
  title text NOT NULL,
  body text,
  payload jsonb,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

| Task | Repo | Notes |
|---|---|---|
| Follow / unfollow button on vendor page | PWA | `FollowStoreButton.tsx` |
| API: `POST/DELETE /api/stores/[id]/follow` | PWA | |
| “Stores you follow” in account | PWA | `src/app/account/following/page.tsx` |
| Vendor: create announcement, see follower count | VP | new `Followers.tsx` |
| Dispatch announcements → push + email | JLO | extend push notification pipeline |

### 2A.2 Store QR — offline → online

| Task | Repo | Notes |
|---|---|---|
| Auto-generate per-vendor QR → `/vendor/[id]` or campaign | JLO/VP | reuse campaign QR generator |
| Downloadable QR poster (PNG/PDF) | VP | simple template |
| Scan analytics event | PWA | extend `campaign_analytics_events` or new `vendor_qr_scans` |

**Builds on:** existing campaign QR in `src/types/campaigns.ts`

### 2A.3 Customer store pickup

| Task | Repo | Notes |
|---|---|---|
| Checkout shipping method: “Collect from seller” when `supports_customer_pickup` | PWA | `src/app/checkout/page.tsx` |
| Order meta: `fulfillment_method: delivery | pickup` | JLO | `create-order.js` |
| Vendor notification + “Ready for collection” status | VP + JLO | extend vendor dispatch |
| Pickup instructions on order confirmation | PWA | order detail |

**Depends on:** Phase 1 physical store verification (`supports_customer_pickup` flag)

### 2A.4 Reorder / Buy again

| Task | Repo | Notes |
|---|---|---|
| “Buy again” on order history + order detail | PWA | `src/app/orders/page.tsx`, `[id]/page.tsx` |
| Re-add line items to cart (handle OOS gracefully) | PWA | cart store |

### 2A.5 Seller actual product photos (#19)

| Task | Repo | Notes |
|---|---|---|
| Product gallery meta: `photo_source: manufacturer | seller_actual` | Catalog | extend product schema |
| Badge on PDP gallery | PWA | `ActualProductPhotoBadge` |
| Vendor upload toggle when adding images | VP | `AddProduct.tsx` |
| Optional ranking boost for seller photos | JLO | search ranking job (Phase 3) |

**Phase 2A exit gate:**
- [ ] Customer can follow/unfollow stores
- [ ] Vendor can download store QR
- [ ] Pickup available for 3+ verified physical stores
- [ ] Buy again works on completed orders
- [ ] Seller actual photos visible on PDP

---

## Phase 2B — Local discovery (Week 13–16)

**Goal:** “Shop near me” without requiring full maps on day one.

### 2B.1 Area-based discovery (no GPS required)

| Task | Repo | Notes |
|---|---|---|
| Vendor public profile: city, area, pickup available | PWA | vendor page + API |
| Browse vendors by city/area filter | PWA | extend `src/app/vendors/page.tsx` |
| PDP: “Also available for collection in Ikeja” | PWA | when seller has physical store |
| Product search filter: “Available near [area]” | PWA | catalog query |

### 2B.2 Geolocation (optional enhancement)

| Task | Repo | Notes |
|---|---|---|
| Enable geolocation in CSP | PWA | `next.config.js` (currently disabled) |
| Store lat/lng on `approved_vendor_locations` | JLO | admin geocode or vendor pin |
| Distance sort on vendor/product search | PWA | haversine in API |
| “X km away — available today” on PDP | PWA | #11 light version |

### 2B.3 Reserve & collect (#11 — Phase 2 version)

| Task | Repo | Notes |
|---|---|---|
| “Reserve & collect” CTA (holds inventory 24–48h) | PWA | vendor page + PDP |
| Reservation order status flow | JLO | `reserved → ready → collected` |
| Vendor confirm reservation | VP | Orders page |

**Phase 2B exit gate:**
- [ ] Vendor discovery by city/area works
- [ ] At least one PDP shows collection option with area
- [ ] Reserve flow tested end-to-end for 1 pilot vendor

---

## Phase 3 — Seller growth & discovery quality (Week 17–22)

**Goal:** Merchants promote themselves; search rewards quality sellers.

### 3.1 Self-service vendor campaigns

**Extend existing campaigns system** — don't fork it.

| Task | Repo | Notes |
|---|---|---|
| Link `campaigns.vendor_id` to vendor (seller-owned campaigns) | JLO | schema addition |
| Vendor campaign builder (lite): hero, products, offer, QR | VP | simplified vs admin builder |
| Approval workflow for vendor campaigns | JLO | admin review queue |
| Slug: `julinemart.com/campaign/[vendor-slug]-[campaign]` | PWA | existing route |

### 3.2 Seller marketing toolkit (start with 3 assets)

| Asset | Generator | Repo |
|---|---|---|
| Store QR poster | PDF/PNG from vendor profile | VP |
| WhatsApp product card | OG image + deep link | VP |
| Campaign share link | copy + UTM | VP |

Defer: Instagram creatives, AI copy, bulk flyer generation.

### 3.3 Video on storefront

| Task | Repo | Notes |
|---|---|---|
| Vendor intro video field on vendor profile | VP + JLO | reuse campaign video playback |
| “Meet the seller” on vendor page | PWA | port `VendorStorySection.tsx` |
| Product video in gallery (optional) | VP + PWA | Woo meta or Supabase media |

### 3.4 Seller quality ranking

| Task | Repo | Notes |
|---|---|---|
| Composite `seller_quality_score` nightly job | JLO | weights: fulfilment, disputes, reviews, verification, response |
| Search/catalog sort option: “Best rated sellers” | PWA | catalog API |
| Deprioritise sellers below threshold | JLO | config flag |

### 3.5 Digital purchase records + warranty (#38, #39)

| Task | Repo | Notes |
|---|---|---|
| Product meta: `warranty_type`, `warranty_months` | Catalog | |
| “My Purchases” enhanced: receipt, warranty expiry, seller contact | PWA | `src/app/account/purchases/page.tsx` |
| Warranty claim → routes to dispute/return | PWA | link to Phase 1 flow |

**Phase 3 exit gate:**
- [ ] 5+ vendor-created campaigns live
- [ ] Marketing toolkit generates QR + WhatsApp card
- [ ] Search can sort by seller quality
- [ ] Purchase archive shows warranty where applicable

---

## Phase 4 — JulineMart Custom (Week 23–36)

**Goal:** Capture made-to-order commerce from WhatsApp/informal channels.

**Pilot vertical first:** pick **one** of: bakers, printers, or tailors.

### 4.1 Schema — customisation

```sql
CREATE TABLE product_customisation_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id bigint NOT NULL,
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  requires_approval boolean DEFAULT false,
  production_days_min int,
  production_days_max int,
  fields jsonb NOT NULL,  -- array of CustomField definitions
  created_at timestamptz DEFAULT now()
);

CREATE TABLE custom_order_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_item_id uuid,
  schema_id uuid REFERENCES product_customisation_schemas(id),
  field_values jsonb NOT NULL,
  price_adjustment numeric(12,2) DEFAULT 0,
  status text DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'seller_reviewing', 'seller_confirmed', 'proof_sent',
    'customer_approved', 'in_production', 'quality_check',
    'ready', 'dispatched', 'delivered', 'cancelled'
  )),
  approved_proof_url text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE custom_order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_order_spec_id uuid REFERENCES custom_order_specs(id),
  sender_type text CHECK (sender_type IN ('customer', 'vendor', 'admin')),
  message text,
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
```

### 4.2 Build sequence (within Phase 4)

| Step | Feature | Repo | Weeks |
|---|---|---|---|
| 4.2.1 | Seller customisation builder (field types + pricing) | VP | 2–3 |
| 4.2.2 | PDP “Customise this item” flow + cart line meta | PWA | 2–3 |
| 4.2.3 | Custom order timeline (distinct from standard orders) | PWA + JLO | 1–2 |
| 4.2.4 | Seller review + confirm feasibility | VP | 1–2 |
| 4.2.5 | Digital proof upload + customer approve/reject | VP + PWA | 2 |
| 4.2.6 | Custom order dedicated chat | PWA + VP | 2 |
| 4.2.7 | Custom-specific Protect rules | Ops + PWA | 1 |
| 4.2.8 | “Request custom order” (open RFQ to seller) | PWA + VP | 2–3 |

### 4.3 Custom field types (seller builder)

| Type | Price impact | Example |
|---|---|---|
| Text | optional +₦ | Engraving name |
| Dropdown | per option | Cake size |
| Multiple choice | per option | Flavours |
| Colour | optional | Icing colour |
| Number / Measurement | formula | Dimensions |
| Image upload | — | Reference photo |
| File upload | — | Logo for printing |
| Date | — | Event date |
| Long instructions | — | Special requests |

**Phase 4 exit gate:**
- [ ] 1 pilot vertical live with 5+ products
- [ ] End-to-end: customise → pay → approve proof → produce → deliver
- [ ] Custom dispute uses approved spec as evidence
- [ ] Custom order chat attached to order

---

## Phase 5 — B2B & platform maturity (Week 37+)

**Goal:** Higher-value orders; seller business tools.

| Feature | Priority | Depends on | Notes |
|---|---|---|---|
| Request a Quote (#34) | High | Phase 4 RFQ patterns | Quantity, specs, delivery date → seller quote → pay |
| Bulk / tier pricing (#33) | Medium | Catalog | 10+/50+/100+ tiers on product |
| Seller CRM-lite (#36) | Medium | Phase 2A follows | Followers, repeat customers, abandoned carts |
| Group corporate purchasing (#35) | Low | Quote + CRM | Org accounts, multi-approver — separate PRD |
| Verified store video (#17) | Low | Phase 1 store verification | Ops-heavy human review |
| Full geolocation marketplace (#20 complete) | Medium | Phase 2B | Maps, distance on all PDPs |

---

## Cross-cutting: what to build once, use everywhere

| Capability | First introduced | Reused in |
|---|---|---|
| `seller_verifications` | Phase 1 | Protect eligibility, ranking, pickup, campaigns |
| `seller_performance_snapshots` | Phase 1 | Vendor page, search ranking, Trusted Seller auto-upgrade |
| `store_follows` | Phase 2A | CRM, announcements, campaigns |
| `approved_vendor_locations` public fields | Phase 1 | Pickup, local discovery, reserve & collect |
| `return_requests` complaint fields | Phase 1 | Disputes, warranty claims, custom order issues |
| Campaign + QR infrastructure | Exists | Store QR, vendor campaigns, offline bridge |
| Push notifications | Exists | Follow alerts, custom order updates, refund complete |

---

## Recommended start — first 30 days

```
Week 1–2  Phase 0
          ├── Remove fake metrics
          ├── JulineMart Protect badge on PDP
          ├── handmade / made-in-nigeria tags
          └── trust types in both repos

Week 3–4  Phase 1 (start)
          ├── seller_verifications migration
          ├── Admin verification approve UI
          └── Vendor page trust badges (Level 1–3)

Week 5–6  Phase 1 (continue)
          ├── Metrics computation job
          ├── Real metrics on vendor page
          └── Structured complaint types on returns

Week 7–8  Phase 1 (finish)
          ├── Refund timeline UX
          ├── Physical store public profile
          └── Phase 1 exit gate review
```

**First meaningful customer-visible milestone (Week 4):** a vendor page showing real verification badges and JulineMart Protect on products.

**First competitive differentiator milestone (Week 8):** verified seller + real performance + structured disputes + refund transparency — the “Trusted Local Commerce” bundle.

---

## Team allocation suggestion

| Track | Owner | Phases |
|---|---|---|
| **Trust & data** | Backend / JLO | Verifications, metrics jobs, returns/disputes, ranking |
| **Customer UX** | PWA frontend | Badges, Protect, vendor page, checkout pickup, custom flows |
| **Seller tools** | Vendor portal | Verification upload, campaigns, customisation builder, followers |
| **Ops / policy** | Business | Protect terms, verification SOP, custom order rules |

---

## Risk register

| Risk | Mitigation |
|---|---|
| Fake metrics left live | Phase 0 is non-negotiable Week 1 |
| Protect promises without ops capacity | Start with narrow eligibility (verified sellers, standard goods) |
| Custom orders scope creep | One vertical pilot; generic builder comes after |
| Geolocation blocked by CSP | Ship area-based discovery first |
| Vendor campaign spam | Admin approval queue in Phase 3 |
| Verification fraud | Manual review for Level 3+; evidence required |

---

## Success metrics by phase

| Phase | KPI |
|---|---|
| 0 | 0 placeholder metrics on site; Protect shown on 100% PDPs |
| 1 | 50+ sellers Level 1+; dispute submission rate tracked; refund NPS |
| 2A | Follow rate; pickup orders %; QR scans → store visits |
| 2B | Local filter usage; reserve conversion |
| 3 | Vendor-created campaigns; seller quality correlates with conversion |
| 4 | Custom order GMV; proof approval reduces dispute rate |
| 5 | Quote-to-order conversion; repeat B2B buyers |

---

*Last updated: August 2026 · Spans julinemart-pwa + julinemart-logistics-orchestrator*
