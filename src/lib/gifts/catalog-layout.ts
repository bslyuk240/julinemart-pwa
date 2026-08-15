import type { GiftBox } from '@/types/gifts';
import {
  GIFT_OCCASIONS,
  GIFT_RECIPIENTS,
  filterGiftBoxes,
} from './discovery';

export type CatalogRecipientRow = {
  slug: string;
  label: string;
  boxes: GiftBox[];
};

export type CatalogOccasionSection = {
  slug: string;
  label: string;
  description?: string;
  rows: CatalogRecipientRow[];
};

const ANYONE_ROW = { slug: 'anyone', label: 'For anyone' };

function applyBudget(boxes: GiftBox[], budget?: string) {
  if (!budget) return boxes;
  return filterGiftBoxes(boxes, { budget });
}

function rowsForBoxes(boxes: GiftBox[], recipientFilter?: string): CatalogRecipientRow[] {
  if (!boxes.length) return [];

  const rows: CatalogRecipientRow[] = [];
  const recipients = recipientFilter
    ? GIFT_RECIPIENTS.filter((r) => r.slug === recipientFilter)
    : GIFT_RECIPIENTS;

  for (const rec of recipients) {
    const matched = boxes.filter((b) => b.recipient_types?.includes(rec.slug));
    if (matched.length) rows.push({ slug: rec.slug, label: rec.label, boxes: matched });
  }

  if (!recipientFilter) {
    const untagged = boxes.filter((b) => !b.recipient_types?.length);
    if (untagged.length) rows.push({ ...ANYONE_ROW, boxes: untagged });
  }

  return rows;
}

/** Browse layout: every occasion with stock gets a section; recipient sub-rows inside. */
export function buildOccasionSections(
  allBoxes: GiftBox[],
  filters: { occasion?: string; recipient?: string; budget?: string },
): CatalogOccasionSection[] {
  const pool = applyBudget(allBoxes, filters.budget);
  const sections: CatalogOccasionSection[] = [];

  const featured = pool.filter((b) => !b.occasion_types?.length);
  if (featured.length && !filters.occasion) {
    const rows = rowsForBoxes(featured, filters.recipient);
    if (rows.length) {
      sections.push({
        slug: 'featured',
        label: 'Featured',
        description: 'Hand-picked gift boxes',
        rows,
      });
    }
  }

  const occasions = filters.occasion
    ? GIFT_OCCASIONS.filter((o) => o.slug === filters.occasion)
    : GIFT_OCCASIONS;

  for (const occ of occasions) {
    const occBoxes = pool.filter((b) => b.occasion_types?.includes(occ.slug));
    if (!occBoxes.length) continue;

    const rows = rowsForBoxes(occBoxes, filters.recipient);
    if (!rows.length) continue;

    sections.push({
      slug: occ.slug,
      label: occ.label,
      description: occ.description,
      rows,
    });
  }

  return sections;
}

export function hasActiveGiftFilters(filters: {
  occasion?: string;
  recipient?: string;
  budget?: string;
}) {
  return Boolean(filters.occasion || filters.recipient || filters.budget);
}

export function filteredFlatBoxes(
  allBoxes: GiftBox[],
  filters: { occasion?: string; recipient?: string; budget?: string },
) {
  return filterGiftBoxes(allBoxes, filters);
}
