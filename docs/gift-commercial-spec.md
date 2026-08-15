# Gift Commercial Model (G4.5)

Last updated: **15 August 2026**

## Principles

1. **Customer** pays one gift price (box total or BYO running total). Promos/discounts reduce customer total only — **platform absorbs**, vendors unaffected (same as marketplace vouchers).
2. **Vendor catalog** pool lines settle at **catalog retail** on `order_items` + per-vendor `sub_orders` — same commission experience as catalog sales.
3. **JLO-sourced** pool lines have no vendor; tracked on `gift_order_line_items` only.
4. **Mixed boxes** (pre-packed or BYO) resolve each line by source individually.

## Data model

| Entity | Purpose |
|--------|---------|
| `gift_commercial_settings` | Per-GFC packaging markup + profit margin defaults |
| `gift_pool_sourced_items` | Pool SKUs without catalog listing |
| `gift_pool_inventory` | Vendor catalog products in pool (`source_type: vendor_catalog`) |
| `gift_order_line_items` | Audit row per component on every gift order |
| `gift_orders.*_subtotal` | Customer vs vendor settlement breakdown |

## Pricing stack (customer)

```
component_cost_total (sum gift_program_cost × qty)
+ packaging_fee + packaging_markup
+ profit margin (% + fixed)
= customer_subtotal (or explicit box list_price for ready-made)
− platform_discount (promo — absorbed by JulineMart)
= customer_total (+ shipping)
```

Vendor settlement subtotal is computed separately at catalog retail — **not** reduced by gift promo.

## Vendor pre-pay

Set `vendor_payout_status: pre_settled` on line when stock was bought before sale. Withdrawal flow should respect this (future: vendor portal flag).

## Admin

- **Gift Fulfilment Centres → Pool:** vendor catalog assign (existing) + **Sourced items** (new)
- **Commercial settings:** packaging markup, profit %, fixed margin per hub
- **Gift Boxes:** list_price = customer price; component costs for margin view

## API

- `POST /api/create-gift-order` — accepts `voucher_code` (re-validated server-side against `campaign_vouchers`); no client-supplied discount amount/percent is accepted
- `POST /api/gift-voucher-validate` — preview campaign voucher discount on gift subtotal
- `GET/POST/PUT/DELETE /api/admin-gift-pool-sourced`

## Remaining (G4.5b)

- [x] BYO checkout uses same commercial insert path
- [x] BYO PWA: hide per-item prices; show running total with margin baked in
- [x] Admin: sourced pool CRUD + commercial settings per hub
- [x] Catalog shipping quote on gift checkout
- [x] Voucher code reuse on gift checkout (platform absorbed)
- [x] Vendor withdrawal `pre_settled` UI
- [x] Sourced items in builder add_item API + admin mobile
