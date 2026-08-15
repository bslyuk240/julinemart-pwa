# JulineMart Trusted Local Commerce — Build Status

> **Canonical plan:** [`trusted-local-commerce-roadmap.md`](./trusted-local-commerce-roadmap.md)
> **Session rules:** `.cursor/rules/trusted-local-commerce-roadmap.mdc`

Last updated: **15 August 2026**

## JulineMart Gifts — Phase G6 IN PROGRESS (personalisation)

### G6 shipped (code)
- [x] Migration: `customisation_spec` on `gift_builder_items` + `gift_order_line_items`
- [x] Reuse `product_customisation_schemas` via `gift-customisation.js` + `gift-product-customisation` API
- [x] BYO builder: customisable pool flag, personalise sheet, server validation on add
- [x] Packing checklist + ops UI show customisation summary lines

### G6 remaining
- [ ] Production-day lead time in G5 date validation for custom items
- [ ] State-aware cancellation after customisation approved (exit gate)

G4.5b box SKU / vouchers / checkout UX is **not** G6 — see G4.5b below.

---

## JulineMart Gifts — Phase G5 COMPLETE (code)

### G5 shipped
- [x] Migration: `requested_delivery_date`, `occasion_date` on `gift_orders`
- [x] `gift-delivery-schedule.js` — Lagos timezone, hub cutoffs, lead time validation
- [x] `gift-delivery-dates` preview API
- [x] `create-gift-order` rejects invalid/past/too-soon dates
- [x] PWA date pickers on ready-made checkout + BYO checkout
- [x] Admin gift ops shows requested delivery + occasion dates
- [x] Secret sender (`sender_visible`) — already on checkout/build

### G5 exit gate
- [ ] Manual QA: impossible dates rejected server-side
- [ ] Recipient address separate from buyer (already implemented — verify E2E)

---

## JulineMart Gifts — Phase G4.5 COMPLETE (commercial model)

### G4.5 shipped (code)
- [x] Migration: `gift_commercial_settings`, `gift_pool_sourced_items`, `gift_order_line_items`
- [x] `gift-commercial.js` — customer margin stack + vendor catalog settlement
- [x] Ready-made + BYO checkout via `insertGiftCommercialOrder` (vendor lines at catalog retail)
- [x] Platform gift discounts absorbed (`gift_discount_amount` / `gift_discount_percent`)
- [x] Admin: sourced pool CRUD + commercial settings per hub (Gift Fulfilment Centres → Pool)
- [x] BYO builder: customer running total with margin baked in; per-item prices hidden in PWA
- [x] BYO builder supports JLO-sourced pool items (`pool_sourced_item_id`)
- [x] Admin pre-paid stock toggle on pool + gift box lines → `vendor_payout_status: pre_settled`

### G4.5 remaining
- [x] Catalog shipping quote on gift checkout (JLO `gift-shipping-quote` + PWA hook)
- [x] Voucher/campaign code on gift checkout (platform absorbed)
- [x] `pre_settled` vendor payout toggle in admin (pool + gift boxes)
- [x] Sourced items in BYO builder add flow

---

## JulineMart Gifts — G4.5b COMPLETE (code) — box SKU, voucher scope, checkout

**Not customisation.** Gift box is one sellable unit (own SKU). Phase 4 / G6 personalisation is a separate layer on items inside the box.

### G4.5b shipped (15 Aug 2026)
- [x] Migration `20260815180000_gift_voucher_scope.sql` — `gift_boxes.sku`; voucher filters `gift_box_skus`, `gift_occasion_slugs`, `gift_recipient_slugs`
- [x] Migration `20260815190000_gift_box_sku_gbx_format.sql` — `gift_orders.box_sku`, `gift_builder_sessions.box_sku`
- [x] Box SKU format **`GBX-{OCCASION}-{RECIPIENT}-{###}`** (first occasion + recipient tag)
- [x] Admin Gift Boxes: **SKU** field + **Generate SKU** (`product-sku-next` GBX prefix) — desktop + mobile
- [x] BYO: auto-generate hidden box SKU at checkout / voucher validate (`ensureBuilderSessionBoxSku`)
- [x] Gift voucher validation: match box SKU / occasion / recipient; marketplace-only vouchers rejected on gift checkout; discount on customer subtotal only; vendors settled in full
- [x] Admin Vouchers: gift restrictions (box SKUs, occasion, recipient)
- [x] PWA gift checkout (ready-made + BYO) mirrors catalog: shipping method, payment method, promo, mobile sticky pay bar

### G4.5b remaining
- [ ] Smoke **Generate SKU** after Netlify dev restart (was `ReferenceError` from deleted `gift-box-sku-next`)
- [ ] Retag existing `GIFT-*` boxes to `GBX-*` (pick occasion/recipient, then Generate SKU)
- [ ] QA: voucher matches box SKU; occasion/recipient filters; catalog voucher rejected on `/gifts/checkout`

---

## JulineMart Gifts — Phase G4 IN PROGRESS

### G3 — COMPLETE (code)
- Build your own box wizard, builder API, packaging tiers

### G4 shipped (code)
- [x] Homepage **Gifts for Every Moment** rail (`GiftsHomeSection`)
- [x] `/gifts` landing with occasion, recipient, budget filters
- [x] SEO routes `/gifts/birthday`, `/gifts/romantic`, etc.
- [x] JLO `gift-boxes` API filter params (`occasion`, `recipient`, `budget_min`/`budget_max`)

### G4 exit gate
- [ ] Homepage section visible with 1+ live boxes (needs tagged boxes + pool SKUs)
- [x] Public catalog hides boxes with no pool-available items at default GFC
- [x] Admin occasion/recipient tagging (desktop + mobile Gift Boxes)
- [x] Analytics: landing → BYO start → purchase (GA4 + `customer_journey_events`)

### G3 exit gate (parallel)
- [ ] Running total updates on add/remove (manual QA)
- [ ] Non-pool items rejected (manual QA)
- [ ] E2E custom box purchase at Warri

---

## JulineMart Gifts — Phase G2 IN PROGRESS

### G1 — COMPLETE
- Ready-made boxes, `/gifts` storefront, `create-gift-order`

### G2 shipped (code)
- [x] Migration `20260814120000_gift_g2_ops.sql`
- [x] `admin-gift-ops`, `gift-message-card`, `customer-gift-order`
- [x] Admin `/admin/gift-ops` (New → Packing → Dispatch → Done)
- [x] PWA `GiftOrderTimeline` on order detail + `/api/gifts/track`
- [x] Pay confirm moves gift to `paid` queue

### G2 exit gate
- [x] Migration applied to Supabase
- [ ] Ops completes full status path on test order
- [ ] Customer sees gift timeline on `/orders/[id]`
- [ ] Message card prints from ops UI

---

## JulineMart Gifts — Phase G1 IN PROGRESS

> **Canonical plan:** [`julinemart-gifts-roadmap.md`](./julinemart-gifts-roadmap.md)

### G0 — COMPLETE
- Migration applied · Warri hub · admin pool · `/api/gifts/pool`

### G1 shipped (code)
- [x] Migration `20260814110000_gift_g1_ready_made_boxes.sql`
- [x] `gift_boxes`, `gift_box_items`, `gift_orders`, `orders.order_kind`
- [x] `admin-gift-boxes`, `gift-boxes`, `create-gift-order`
- [x] Admin `/admin/gift-boxes`
- [x] PWA `/gifts`, `/gifts/boxes/[slug]`, `/gifts/checkout`

### G1 exit gate (verify manually)
- [x] Migration applied to Supabase
- [ ] 3+ test boxes with pool items in admin
- [ ] E2E Paystack → gift order with packing checklist in sub_order metadata
- [ ] Component costs visible in admin margin row

---

## JulineMart Gifts — Phase G0 IN PROGRESS

> **Canonical plan:** [`julinemart-gifts-roadmap.md`](./julinemart-gifts-roadmap.md)
> **Rules:** `.cursor/rules/julinemart-gifts.mdc`

**Pilot hub:** Warri (`code=warri`, admin can add more hubs)

### G0 shipped (code)
- [x] Migration `20260814100000_gift_g0_foundation.sql`
- [x] `admin-gift-fulfilment-centres` — hub CRUD
- [x] `admin-gift-pool` — pool assign + product eligibility
- [x] `gift-pool-products` — public pool API
- [x] Admin UI `/admin/gift-fulfilment-centres`
- [x] PWA proxy `/api/gifts/pool`

### G0 exit gate (verify after migration apply)
- [x] Migration applied to Supabase
- [ ] Admin added second test hub without deploy
- [ ] 30+ products in Warri pool
- [ ] `GET /api/gifts/pool?gfc=warri` returns only pool SKUs

---

## JulineMart Gifts — PLANNED (not started)

> **Canonical plan:** [`julinemart-gifts-roadmap.md`](./julinemart-gifts-roadmap.md)
> **Rules:** `.cursor/rules/julinemart-gifts.mdc`

**Pilot consolidation hub:** **Warri** — admin can add more hubs via `gift_fulfilment_centres`.

| Phase | Status | Theme |
|-------|--------|--------|
| G0 | **Complete** | Warri hub + admin hub CRUD + gift pool + eligibility |
| G1 | **Complete** | Ready-made boxes |
| G2 | **Complete** (code) | Ops dashboard + packing |
| G3 | **Complete** (code) | Build your own box |
| G4 | **In progress** | Discovery, homepage, SEO filters |
| G4.5 | **Complete** (code) | Commercial model (customer price vs vendor settlement) |
| G4.5b | **Complete** (code) | Box SKU `GBX-*`, gift voucher scope, catalog-style checkout |
| G5 | **Complete** (code) | Delivery scheduling + secret sender |
| G6 | **In progress** | Personalisation via Phase 4 schemas |
| G7 | Pending | Growth |

Trusted Local Commerce Phase 4 (Custom) should complete or pass exit gate before heavy G6 personalisation overlap.

---

## Active phase: **Phase 4** (JulineMart Custom — first slice)

### Phase 4 — IN PROGRESS (apply migration #6)
- [x] Schema: `product_customisation_schemas`, `custom_order_specs`, `custom_order_messages`
- [x] Shared types (`src/types/custom-order.ts`) in PWA + JLO
- [x] Vendor customisation builder (baker template pilot)
- [x] PDP “Customise this item” + cart/checkout passthrough
- [x] `create-order` snapshots custom specs + price adjustment
- [x] Customer custom order timeline on order detail
- [x] Vendor custom orders queue
- [ ] Proof upload UI (vendor portal — URL field only for now)
- [ ] RFQ / quote flow (Phase 4.2.8 — deferred)

**Pilot vertical:** bakers (cakes & events)

---

## Phase summary

| Phase | Status | Theme |
|---|---|---|
| 0–2B | Complete* | (*migrations pending apply on Supabase) |
| 3–3.5 | Complete* | Seller growth, warranty, campaigns |
| 4 | **Active** | JulineMart Custom (made-to-order) |
| 5 | Pending | B2B & maturity |

---

## Phase 4 shipped — custom orders foundation (13 Aug 2026)

**Migration:** `20260814000005_phase_4_custom_orders.sql`

**JLO:**
- `vendor-product-customisation` — GET/PUT/DELETE schema per product
- `vendor-custom-orders` — vendor queue + status updates
- `customer-custom-order` — customer timeline + proof approval
- `create-order` — validates customisation, inserts `custom_order_specs`
- `catalog-product` — exposes `customisation_schema` on PDP fetch

**PWA:**
- `CustomiseProductPanel` on PDP when schema exists
- Cart line items carry `customisation` + price adjustment
- `/api/custom-order` proxy
- `CustomOrderTimeline` on `/orders/[id]`

**Vendor portal:**
- `/products/edit/:id/customise` — field builder + baker template
- `/custom-orders` — production queue

---

## Migrations to apply (in order)

1. `20260814000000_seller_trust_foundation.sql`
2. `20260814000001_phase_2a_retention_local.sql`
3. `20260814000002_phase_2b_local_discovery.sql`
4. `20260814000003_phase_3_seller_growth.sql`
5. `20260814000004_phase_3_warranty_purchases.sql`
6. `20260814000005_phase_4_custom_orders.sql`
7. Gift: `20260815180000_gift_voucher_scope.sql` (applied)
8. Gift: `20260815190000_gift_box_sku_gbx_format.sql` (applied)

---

## Phase 3.5 — warranty & purchases (13 Aug 2026)

See prior sections in git history / roadmap doc.
