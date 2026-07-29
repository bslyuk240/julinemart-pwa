import type { ProductAttribute, ProductVariation } from '@/types/product';

export function normalizeVariationKey(value: string) {
  return (value ?? '')
    .toLowerCase()
    .trim()
    .replace(/^attribute[_-]/, '')
    .replace(/^pa[_-]/, '')
    .replace(/^product[_-]/, '')
    .replace(/[^a-z0-9]+/g, '');
}

export function normalizeVariationValue(value: string) {
  return (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function dedupeOptions(options: string[]) {
  return Array.from(new Set(options.map((option) => option.trim()).filter(Boolean)));
}

/** Clean CJ-style option labels: "1544707-White-Size" → "White" */
export function cleanOptionLabel(option: string): string {
  const withoutPrefix = option.replace(/^\d{4,}[\d-]*-/, '');
  const withoutSuffix = withoutPrefix.replace(/-size$/i, '').trim();
  return withoutSuffix || option;
}

export function inferVariationAttributes(variations: ProductVariation[]): ProductAttribute[] {
  const map = new Map<string, { name: string; options: string[] }>();

  variations.forEach((variation) => {
    variation.attributes.forEach((attr) => {
      const rawName = (attr.name ?? '').trim();
      const rawOption = (attr.option ?? '').trim();
      if (!rawName || !rawOption) return;

      const key = normalizeVariationKey(rawName);
      if (!key) return;

      const existing = map.get(key);
      if (existing) {
        existing.options.push(rawOption);
        if (!existing.name && rawName) existing.name = rawName;
        return;
      }

      map.set(key, { name: rawName, options: [rawOption] });
    });
  });

  return Array.from(map.values()).map((attr, index) => ({
    id: index + 1,
    name: attr.name,
    position: index,
    visible: true,
    variation: true,
    options: dedupeOptions(attr.options),
  }));
}

export function hasUsableInlineVariations(
  items: ProductVariation[] | undefined | null
): items is ProductVariation[] {
  if (!items?.length) return false;
  return items.every(
    (variation) =>
      Array.isArray(variation.attributes) &&
      variation.attributes.some(
        (attr) => Boolean((attr.name ?? '').trim()) && Boolean((attr.option ?? '').trim())
      )
  );
}

export function matchesVariationSelection(
  variation: ProductVariation,
  selectedKeyedAttrs: Record<string, string>,
  overrides: Record<string, string> = {},
  strict = false
): boolean {
  if (!variation.attributes.length) return false;

  let matchedDimensions = 0;

  return (
    variation.attributes.every((attr) => {
      const key = normalizeVariationKey(attr.name ?? '');
      if (!key) return true;

      const expected = Object.prototype.hasOwnProperty.call(overrides, key)
        ? overrides[key]
        : selectedKeyedAttrs[key];

      if (!expected) {
        return strict ? false : true;
      }

      matchedDimensions += 1;
      return (
        normalizeVariationValue(expected) === normalizeVariationValue(attr.option ?? '')
      );
    }) && (!strict || matchedDimensions > 0)
  );
}

export function parseMoney(...values: Array<string | number | null | undefined>): number {
  for (const value of values) {
    const num = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
    if (Number.isFinite(num) && num > 0) return num;
  }
  return 0;
}
