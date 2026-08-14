# JulineMart Gifts — Product Roadmap

> **Positioning:** JulineMart Gifts is a **gifting layer on top of the existing marketplace** — not a separate shop.
>
> **Pilot consolidation hub:** **Warri** (admin can add more hubs from day one).
>
> **Strategic goal:** When someone thinks *"I need to send somebody a gift,"* JulineMart should be one of the first brands that comes to mind — then discover the wider marketplace.

Last updated: **14 August 2026**

---

## Core principle

The customer buys **one gifting experience** (package price, emotional UX). The backend handles products, vendors, costs, inventory pool, consolidation at a **gift fulfilment centre (GFC)**, packaging, and delivery.

```text
Gift need → JulineMart Gifts → Purchase → JulineMart account → Wider marketplace → Repeat
```

**Do not** expose the full marketplace catalog in the gift builder. Only **gift-eligible** products in the **inventory pool** at the selected GFC.

---

## Relationship to existing modules

| Module | Reuse for Gifts |
|--------|-----------------|
| Marketplace (`products`, `orders`, Paystack) | Order + payment backbone |
| JulineMart Custom (Phase 4) | Personalisation schemas — **do not duplicate** a second customisation system |
| JulineMart Protect | Buyer protection on gift orders |
| JLO logistics / Fez | Last-mile after pack complete |
| Vendor portal | Gift programme opt-in + `gift_program_cost` (later phase) |
| Campaigns | Seasonal gift landing pages (`gift_campaigns`) |

---

## Consolidation hubs (GFC)

**First hub:** Warri Gift Hub (seed in migration).

**Admin must be able to add, edit, and deactivate hubs** — not hard-coded to one city.

### Entity: `gift_fulfilment_centres`

| Field | Purpose |
|-------|---------|
| `id` | UUID |
| `name` | e.g. "Warri Gift Hub" |
| `code` | Short slug e.g. `warri` |
| `country`, `state`, `city`, `address` | Physical consolidation location |
| `active` | Soft-disable without deleting history |
| `is_default` | Default GFC for new sessions (Warri at launch) |
| `supported_delivery_zones` | JSON / zone ids — which areas this hub serves |
| `cutoff_time` | Same-day / next-day cutoffs (future) |
| `same_day_supported`, `next_day_supported` | Flags for scheduling (G5) |
| `created_at`, `updated_at` | Audit |

### Entity: `gift_pool_inventory`

Products available for gift consolidation **at a specific GFC**:

| Field | Purpose |
|-------|---------|
| `gift_fulfilment_centre_id` | Which hub holds / can source this SKU |
| `product_id`, `variation_id` | Catalog reference |
| `available_qty` | Pool stock (may differ from vendor stock) |
| `gift_program_cost` | Acquisition cost for margin calc |
| `lead_time_days` | Prep before pack |
| `active` | In pool or not |

**Rule:** Build-a-Box and ready-made boxes only show SKUs where `gift_pool_inventory.active = true` at the customer's selected (or default) GFC.

---

## Gift modes

### Mode A — Ready-made gift boxes

Preconfigured by admin. Customer sees **one price** (experience, not line-item retail).

Entities: `gift_boxes`, `gift_box_items` → checkout as `order_kind = gift_ready_made`.

### Mode B — Build your own gift box

Wizard + **running total** → `gift_builder_sessions`, `gift_builder_items` → checkout as `order_kind = gift_custom`.

Steps (UX): Who → Occasion → Budget → Box tier → Pick items → Personalise (G6) → Message → Recipient → Delivery date → Pay.

---

## Product eligibility

Extend `products` (and admin UI):

- `gift_eligible` (boolean)
- `gift_category`, `gift_recipient_types[]`, `gift_occasion_types[]`
- `gift_box_compatible`, packaging constraints (future)
- Pool assignment is **separate** via `gift_pool_inventory` per GFC

---

## Order model

Normal `orders` row + gift metadata (table `gift_orders` 1:1 recommended):

- `order_kind`: `marketplace` \| `gift_ready_made` \| `gift_custom`
- Recipient block, message, sender visibility, occasion, packaging tier
- `gift_fulfilment_centre_id`, `gift_builder_session_id`, `gift_box_id`
- Gift-specific status (ops timeline) — distinct from marketplace sub-order status

Settlement: `order_items` still hold component lines for vendor/supplier cost tracking.

---

## Phased delivery (test before next)

Each phase has an **exit gate**. Do not start N+1 until gate passes.

### Phase G1 — Ready-made boxes (IN PROGRESS)

**Theme:** Admin-curated boxes, customer purchase as one gift SKU.

| Deliverable | Status |
|-------------|--------|
| `gift_boxes`, `gift_box_items`, `gift_orders` | Migration applied |
| Admin CRUD ready-made boxes | Done |
| PWA `/gifts` + box PDP + checkout | Done |
| `create-gift-order` with packing items | Done |

**Exit gate:** see BUILD-STATUS.md

---

### Phase G0 — Foundation (COMPLETE)

**Theme:** Warri hub + admin hub CRUD + gift pool + product eligibility.

| Deliverable | Status |
|-------------|--------|
| Migration + Warri seed | Applied to Supabase |
| Admin hub CRUD | Done |
| Admin pool assignment | Done |
| `gift-pool-products` API | Done |
| PWA `/api/gifts/pool` proxy | Done |

**Exit gate:** see BUILD-STATUS.md

---

### Phase G1 — Ready-made boxes (Mode A)

**Theme:** Admin-curated boxes, customer purchase as one gift SKU.

| Deliverable | Owner |
|-------------|-------|
| `gift_boxes`, `gift_box_items` | JLO |
| Admin CRUD ready-made boxes | JLO dashboard |
| PWA `/gifts` MVP + box PDP | PWA |
| `create-gift-order` or extend `create-order` with `order_kind` | JLO |
| Recipient + message fields at checkout | PWA |

**Exit gate:**
- [ ] 3+ test boxes live
- [ ] E2E pay → gift order with packing item list
- [ ] Component costs stored for margin

---

### Phase G2 — Gift fulfilment & ops

**Theme:** Packing checklist, card print, gift status timeline.

| Deliverable | Owner |
|-------------|-------|
| JLO Gifts ops dashboard (tabs: New → Packing → Dispatch → Done) | JLO |
| Printable message card | JLO |
| Customer gift timeline (subset of statuses) | PWA |
| QC + optional pack photo | JLO |

**Exit gate:**
- [ ] Ops completes full status path on test order
- [ ] Customer sees gift-specific tracking
- [ ] Card prints with message + branding

---

### Phase G3 — Build your own box (Mode B)

**Theme:** Wizard, running total, session → order.

| Deliverable | Owner |
|-------------|-------|
| `gift_builder_sessions`, `gift_builder_items` | JLO |
| Builder API + session persist | JLO |
| PWA `/gifts/build` wizard | PWA |
| `gift_packaging_types` (Standard / Premium / Luxury) | JLO |

**Exit gate:**
- [ ] Running total updates on add/remove/customisation
- [ ] Cannot add non-pool items
- [ ] E2E custom box purchase at Warri hub

---

### Phase G4 — Discovery & homepage

**Theme:** Acquisition layer — occasions, recipients, budget, SEO.

| Deliverable | Owner |
|-------------|-------|
| Homepage "Gifts for Every Moment" | PWA |
| Full `/gifts` landing | PWA |
| Filters: occasion, recipient, budget | PWA + JLO |
| SEO routes `/gifts/birthday`, etc. | PWA |
| `gift_campaigns` seasonal rails | JLO + PWA |

**Exit gate:**
- [ ] Homepage section live
- [ ] Filters respect pool availability at default GFC
- [ ] Analytics: landing → BYO start → purchase

---

### Phase G5 — Delivery scheduling & recipient UX

**Theme:** Dates, cutoffs, secret sender.

| Deliverable | Owner |
|-------------|-------|
| `requested_delivery_date`, `occasion_date` | JLO |
| Server-side date validation (inventory + lead time + zone) | JLO |
| Secret sender / show sender name | PWA |

**Exit gate:**
- [ ] Impossible dates rejected
- [ ] Recipient address separate from buyer

---

### Phase G6 — Personalisation (reuse JulineMart Custom)

**Theme:** Engraving, cake fields, etc. via existing `product_customisation_schemas`.

**Exit gate:**
- [ ] Custom fields in BYO without new schema tables
- [ ] Customisation on packing checklist
- [ ] State-aware cancellation after customisation approved

---

### Phase G7 — Growth (post-MVP metrics)

Surprise Me, saved recipients, QR in box, corporate `/gifts/business`, multi-hub routing by customer zone, same-day, AI assistant (mutates builder session only — never fictional SKUs).

**Gate:** 4–8 weeks MVP metrics — orders/week, margin/box, gift→marketplace conversion.

---

## MVP launch content (when G1–G4 complete)

- **10–15** ready-made boxes (birthday, romantic, mum, dad, etc.)
- **30–50** pool products at **Warri** hub
- Branded JulineMart Gift Box + message card
- One consolidation hub (Warri); admin can add more before public launch if ops ready

---

## MVP definition of done (combined G1–G5)

See original feature rundown §60 — all items must pass before marketing launch.

---

## Critical business metrics

| Metric | Why |
|--------|-----|
| Gift orders / revenue / AOV | Vertical health |
| Contribution margin per box | Commercial viability |
| Gift buyer → marketplace purchase % | Acquisition proof |
| Gift recipient → signup / purchase % | QR loop (G7) |
| Build-your-own vs ready-made mix | Product insight |

---

## UX principle

Emotional, simple, visual — not an enterprise form. Large cards, progressive steps, running total always visible in BYO.

## Ops principle

**Never offer a combination Warri (or any GFC) cannot fulfil.** Availability = pool qty + lead time + packaging + delivery zone + date.

## Commercial principle

Sell curation + packaging + convenience. Backend tracks full margin stack per order (§57 in original rundown).

---

## Repo ownership

| Area | Repo |
|------|------|
| `/gifts`, builder UX, homepage, checkout recipient UI | **julinemart-pwa** |
| GFC admin, pool, gift orders, ops dashboard, APIs | **julinemart-logistics-orchestrator** |
| Gift programme vendor settings | **vendor-portal** (in JLO) |

---

## Canonical cross-references

- Trusted Local Commerce: `docs/trusted-local-commerce-roadmap.md`
- Build status: `docs/BUILD-STATUS.md`
- Cursor rules: `.cursor/rules/julinemart-gifts.mdc`
