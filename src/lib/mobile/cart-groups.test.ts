import { describe, expect, it } from 'vitest';
import type { CartItem } from '@/types/cart';
import { groupCartBySeller } from './cart-groups';

const line = (id: number, vendorName?: string) => ({ id, vendorName }) as CartItem;

describe('groupCartBySeller', () => {
  it('groups lines by seller in first-seen order', () => {
    const groups = groupCartBySeller([line(1, 'Vikuves Household'), line(2, 'JulineMart Official Store'), line(3, 'Vikuves Household')]);
    expect(groups.map((g) => [g.seller, g.items.map((i) => i.id)])).toEqual([
      ['Vikuves Household', [1, 3]],
      ['JulineMart Official Store', [2]],
    ]);
  });

  it('puts lines without a seller under JulineMart', () => {
    expect(groupCartBySeller([line(1), line(2, '  ')])[0]).toMatchObject({ seller: 'JulineMart' });
  });
});
