# Design critique: wave 1 mobile previews

Reviewed: `index.html` (8 phone screens, 390 × 844) against Material 3, with Apple's HIG as a cross-check, plus the Impeccable detector.

## Overall impression

These read as an Android shopping app rather than a shrunken website. Each screen has one clear primary action, and the purple and orange stay recognisably JulineMart. The biggest gain is the pinned buy bar on the product page. The biggest open decision is whether the new navigation bar also replaces the current one on Home (plan, open question 6).

## Usability

| Finding | Severity | Resolution |
|---|---|---|
| The listing top bar repeated the cart (with badge) that the navigation bar already shows | 🟡 Moderate | **Fixed.** Cart icon removed from the top bar on tab screens. It stays on the product page, where the navigation bar is hidden. |
| Sort appeared both as a chip and inside the filter sheet: two places for one setting | 🟡 Moderate | **Fixed.** The filter sheet holds filters only. The "Popular" chip opens its own sort sheet. |
| "Store pickup" could read as always available | 🟡 Moderate | **Fixed in caption.** It shows only when every item is eligible, as the checkout code does today. |
| The quick-add "+" on a product with options can't add it straight away | 🟢 Minor | **Documented.** It opens a small option sheet first (pump colour). |
| The product page gallery has no image counter | 🟢 Minor | Open. Show a "1 / n" pill only when a product has more than one photo (the pump has one). |
| The snackbar briefly covers the "Sold by" row | 🟢 Minor | Accepted. It's transient (about 4s) and sits above the buy bar per M3. |

## Visual hierarchy

- **Product page:** the eye goes photo, then name, then price (28px bold), then the buy bar. That's the right order.
- **Listing:** the chips read as state, because applied filters are filled. Price is the strongest text on each card.
- **Checkout:** "Pay ₦43,210.67" is the only filled button on screen. The total is repeated in the summary.

## Consistency

| Element | Issue | Resolution |
|---|---|---|
| Thumbnails | Two images used `cover` with no border, while the rest used `contain` on white with a hairline | **Fixed.** One treatment everywhere. |
| Typeface | The detector flags Inter | Kept on purpose. It's the storefront's existing brand face, mapped onto the Material type roles. |

## Accessibility

- **Contrast:** placeholder and outline text measured 4.1:1 against the sheet. **Fixed:** the outline token is darkened to pass 4.5:1. White on brand orange measures 2.6:1 and fails, so orange buttons use dark text (#2b1000, about 7:1).
- **Touch targets:** at least 48px for every control. Chips and the 40px add and stepper buttons get extended hit areas.
- **Text:** body text 14–16px, inputs 16px (prevents iOS zoom), labels never under 11px.
- **Motion:** the skeleton shimmer stops when the phone is set to reduce motion.

## Detector

The remaining hits are false positives from the mock phone frame (`.phone` clipping its children and counting as a "card"), plus the intentional Inter flag above. There are no contrast findings left.

## What works well

- The pinned buy bar and the snackbar keep the shopper on the product page instead of sending them away to the cart.
- Grouping by seller in the cart and checkout matches how a multivendor order actually ships.
- The skeleton replaces today's full-screen spinner with the screen's final shape.
