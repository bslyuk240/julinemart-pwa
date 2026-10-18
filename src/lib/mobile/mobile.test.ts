import { describe, expect, it, vi } from 'vitest';
import { closeTopOverlay, hasOpenOverlay, pushOverlay } from './back-stack';
import { getMobileTierRoute, matchesPattern } from './mobile-tier-routes';
import { activeTab } from './tabs';
import { hasInAppHistory, recordNavigation, resetNavigationTrail } from './nav-history';

describe('nav history', () => {
  it('has no in-app history on a cold landing', () => {
    resetNavigationTrail();
    recordNavigation('/product/fan');
    expect(hasInAppHistory()).toBe(false);
  });

  it('tracks forward navigation and pops on back', () => {
    resetNavigationTrail();
    recordNavigation('/category/electronics');
    recordNavigation('/product/fan');
    expect(hasInAppHistory()).toBe(true);
    recordNavigation('/category/electronics');
    expect(hasInAppHistory()).toBe(false);
  });
});

describe('matchesPattern', () => {
  it('matches exact paths only when no wildcard', () => {
    expect(matchesPattern('/cart', '/cart')).toBe(true);
    expect(matchesPattern('/cart', '/cart/x')).toBe(false);
  });

  it('matches children of a /* prefix but not the bare prefix', () => {
    expect(matchesPattern('/product/*', '/product/fan')).toBe(true);
    expect(matchesPattern('/product/*', '/product')).toBe(false);
    expect(matchesPattern('/product/*', '/products')).toBe(false);
  });
});

describe('getMobileTierRoute', () => {
  const routes = [
    { pattern: '/product/*', tabBar: false },
    { pattern: '/cart', tabBar: true },
  ];

  it('returns the matching route config', () => {
    expect(getMobileTierRoute('/product/fan', routes)).toEqual({ pattern: '/product/*', tabBar: false });
    expect(getMobileTierRoute('/cart', routes)?.tabBar).toBe(true);
  });

  it('returns null for unlisted routes and missing paths', () => {
    expect(getMobileTierRoute('/', routes)).toBeNull();
    expect(getMobileTierRoute(null, routes)).toBeNull();
  });

  it('keeps Home out of the mobile tier', () => {
    expect(getMobileTierRoute('/')).toBeNull();
  });

  it('puts category listings in the mobile tier with the tab bar, search without', () => {
    expect(getMobileTierRoute('/category/electronics')?.tabBar).toBe(true);
    expect(getMobileTierRoute('/search')?.tabBar).toBe(false);
    expect(getMobileTierRoute('/categories')?.tabBar).toBe(true);
  });

  it('runs gift flows full-screen and gift catalogues with the tab bar', () => {
    expect(getMobileTierRoute('/gifts/build')?.tabBar).toBe(false);
    expect(getMobileTierRoute('/gifts/checkout')?.tabBar).toBe(false);
    expect(getMobileTierRoute('/gifts/boxes/bloom-box')?.tabBar).toBe(false);
    expect(getMobileTierRoute('/gifts')?.tabBar).toBe(true);
    expect(getMobileTierRoute('/gifts/birthday')?.tabBar).toBe(true);
  });

  it('puts the tab roots in the mobile tier but not account sub-pages yet', () => {
    expect(getMobileTierRoute('/wishlist')?.tabBar).toBe(true);
    expect(getMobileTierRoute('/account')?.tabBar).toBe(true);
    expect(getMobileTierRoute('/account/orders')).toBeNull();
  });

  it('shows the tab bar on the cart but not during checkout', () => {
    expect(getMobileTierRoute('/cart')?.tabBar).toBe(true);
    expect(getMobileTierRoute('/checkout')?.tabBar).toBe(false);
  });

  it('puts product pages in the mobile tier without the tab bar', () => {
    expect(getMobileTierRoute('/product/water-pump')).toEqual({ pattern: '/product/*', tabBar: false });
  });
});

describe('activeTab', () => {
  it('lights Home only on the exact root', () => {
    expect(activeTab('/')).toBe('home');
    expect(activeTab('/gifts')).toBeNull();
  });

  it('keeps parent tabs lit on child screens', () => {
    expect(activeTab('/category/electronics')).toBe('categories');
    expect(activeTab('/search')).toBe('categories');
    expect(activeTab('/account/orders')).toBe('account');
    expect(activeTab('/orders/123')).toBe('account');
    expect(activeTab('/account/wishlist')).toBe('wishlist');
  });

  it('does not treat lookalike prefixes as children', () => {
    expect(activeTab('/cartography')).toBeNull();
    expect(activeTab('/accounts-deletion')).toBeNull();
  });
});

describe('back stack', () => {
  it('closes the most recent overlay first', () => {
    const first = vi.fn();
    const second = vi.fn();
    const popFirst = pushOverlay(first);
    const popSecond = pushOverlay(second);

    expect(hasOpenOverlay()).toBe(true);
    expect(closeTopOverlay()).toBe(true);
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();

    popSecond();
    popFirst();
    expect(hasOpenOverlay()).toBe(false);
    expect(closeTopOverlay()).toBe(false);
  });
});
