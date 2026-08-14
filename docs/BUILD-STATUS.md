# JulineMart Trusted Local Commerce — Build Status

> **Canonical plan:** [`trusted-local-commerce-roadmap.md`](./trusted-local-commerce-roadmap.md)
> **Session rules:** `.cursor/rules/trusted-local-commerce-roadmap.mdc`

Last updated: **13 August 2026**

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
