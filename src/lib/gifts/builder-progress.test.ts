import { describe, expect, it } from 'vitest';
import { clampGiftBuilderStep } from './builder-progress';

describe('clampGiftBuilderStep', () => {
  it('restores checkout only when a box and items exist', () => {
    expect(clampGiftBuilderStep(3, { hasPackaging: true, itemCount: 2 })).toBe(3);
    expect(clampGiftBuilderStep(3, { hasPackaging: true, itemCount: 0 })).toBe(2);
    expect(clampGiftBuilderStep(3, { hasPackaging: false, itemCount: 0 })).toBe(1);
  });

  it('keeps earlier steps as saved', () => {
    expect(clampGiftBuilderStep(0, { hasPackaging: true, itemCount: 2 })).toBe(0);
    expect(clampGiftBuilderStep(2, { hasPackaging: true, itemCount: 0 })).toBe(2);
  });

  it('falls back to the first step for junk values', () => {
    expect(clampGiftBuilderStep(null, { hasPackaging: true, itemCount: 2 })).toBe(0);
    expect(clampGiftBuilderStep('2', { hasPackaging: true, itemCount: 2 })).toBe(0);
    expect(clampGiftBuilderStep(-4, { hasPackaging: true, itemCount: 2 })).toBe(0);
    expect(clampGiftBuilderStep(1.5, { hasPackaging: true, itemCount: 2 })).toBe(0);
  });
});
