# JulineMart Trusted Local Commerce — Build Status

> **Canonical plan:** [`trusted-local-commerce-roadmap.md`](./trusted-local-commerce-roadmap.md)
> **Session rules:** `.cursor/rules/trusted-local-commerce-roadmap.mdc`

Last updated: **14 August 2026**

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
| G0 | **Next** | Warri hub + admin hub CRUD + gift pool + eligibility |
| G1 | Pending | Ready-made boxes |
| G2 | Pending | Ops dashboard + packing |
| G3 | Pending | Build your own box |
| G4–G7 | Pending | Discovery, scheduling, personalisation, growth |

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

---

## Phase 3.5 — warranty & purchases (13 Aug 2026)

See prior sections in git history / roadmap doc.
