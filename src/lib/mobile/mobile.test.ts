import { describe, expect, it, vi } from 'vitest';
import { closeTopOverlay, hasOpenOverlay, pushOverlay } from './back-stack';
import { getMobileTierRoute, isFlowRoute, matchesPattern } from './mobile-tier-routes';
import { activeTab } from './tabs';
import { hasInAppHistory, recordNavigation, resetNavigationTrail } from './nav-history';
import { pullRefreshMode, registerSoftRefresh, runSoftRefresh } from './soft-refresh';

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

  it('puts Home in the mobile tier with the tab bar', () => {
    expect(getMobileTierRoute('/')?.tabBar).toBe(true);
  });

  it('puts category listings in the mobile tier with the tab bar, search without', () => {
    expect(getMobileTierRoute('/category/electronics')?.tabBar).toBe(true);
    expect(getMobileTierRoute('/search')?.tabBar).toBe(false);
    expect(getMobileTierRoute('/categories')?.tabBar).toBe(true);
    expect(getMobileTierRoute('/products')?.tabBar).toBe(true);
  });

  it('runs gift flows full-screen and gift catalogues with the tab bar', () => {
    expect(getMobileTierRoute('/gifts/build')?.tabBar).toBe(false);
    expect(getMobileTierRoute('/gifts/checkout')?.tabBar).toBe(false);
    expect(getMobileTierRoute('/gifts/boxes/bloom-box')?.tabBar).toBe(false);
    expect(getMobileTierRoute('/gifts')?.tabBar).toBe(true);
    expect(getMobileTierRoute('/gifts/birthday')?.tabBar).toBe(true);
  });

  it('puts the tab roots, account sub-pages and the return flow in the mobile tier', () => {
    expect(getMobileTierRoute('/wishlist')?.tabBar).toBe(true);
    expect(getMobileTierRoute('/account')?.tabBar).toBe(true);
    expect(getMobileTierRoute('/account/orders')).toBeNull();
    expect(getMobileTierRoute('/account/addresses')?.tabBar).toBe(true);
    expect(getMobileTierRoute('/account/orders/12/return')?.tabBar).toBe(false);
    expect(getMobileTierRoute('/returns/r-1/track')?.tabBar).toBe(false);
    expect(getMobileTierRoute('/orders')?.tabBar).toBe(true);
    expect(getMobileTierRoute('/orders/abc-123')?.tabBar).toBe(true);
  });

  it('runs auth and order success full-screen without the tab bar', () => {
    for (const path of ['/login', '/signup', '/forgot-password', '/reset-password', '/order-success']) {
      expect(getMobileTierRoute(path)?.tabBar).toBe(false);
    }
  });

  it('puts brand and store pages in the mobile tier with the tab bar', () => {
    for (const path of ['/brands', '/brand/philips', '/vendors', '/vendor/12']) {
      expect(getMobileTierRoute(path)?.tabBar).toBe(true);
    }
  });

  it('puts contact and info pages in the mobile tier with the tab bar', () => {
    expect(getMobileTierRoute('/contact')?.tabBar).toBe(true);
    expect(getMobileTierRoute('/page/refund_returns')?.tabBar).toBe(true);
    expect(getMobileTierRoute('/page')).toBeNull();
  });

  it('shows the tab bar on the cart but not during checkout', () => {
    expect(getMobileTierRoute('/cart')?.tabBar).toBe(true);
    expect(getMobileTierRoute('/checkout')?.tabBar).toBe(false);
  });

  it('puts product pages in the mobile tier without the tab bar', () => {
    expect(getMobileTierRoute('/product/water-pump')).toEqual({ pattern: '/product/*', tabBar: false });
  });
});

describe('isFlowRoute', () => {
  it('quiets checkout, the gift box builder and order success', () => {
    expect(isFlowRoute('/checkout')).toBe(true);
    expect(isFlowRoute('/gifts/build')).toBe(true);
    expect(isFlowRoute('/gifts/checkout')).toBe(true);
    expect(isFlowRoute('/order-success')).toBe(true);
  });

  it('leaves browsing screens alone', () => {
    expect(isFlowRoute('/')).toBe(false);
    expect(isFlowRoute('/gifts')).toBe(false);
    expect(isFlowRoute('/cart')).toBe(false);
    expect(isFlowRoute('/product/fan')).toBe(false);
    expect(isFlowRoute(null)).toBe(false);
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
    expect(activeTab('/contact')).toBe('account');
    expect(activeTab('/page/privacy-policy')).toBe('account');
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

describe('pull to refresh', () => {
  it('stays off on forms and multi-step flows', () => {
    for (const path of ['/checkout', '/login', '/signup', '/contact', '/search', '/gifts/build', '/account/orders/12/return', '/account/orders/12/refund', '/returns/r-1/add-tracking', '/auth/google/callback', '/account-deletion', '/vendor/10', '/vendors']) {
      expect(pullRefreshMode(path)).toBe('off');
    }
  });

  it('re-renders server pages in place and soft-refreshes everything else', () => {
    expect(pullRefreshMode('/categories')).toBe('server');
    expect(pullRefreshMode('/brand/philips')).toBe('server');
    expect(pullRefreshMode('/page/privacy-policy')).toBe('server');
    expect(pullRefreshMode('/product/water-pump')).toBe('server');
    expect(pullRefreshMode('/cart')).toBe('server');
    expect(pullRefreshMode('/account/orders/12')).toBe('soft');
    expect(pullRefreshMode('/returns/r-1/track')).toBe('soft');
    expect(pullRefreshMode('/')).toBe('soft');
    expect(pullRefreshMode('/orders')).toBe('soft');
    expect(pullRefreshMode('/checkouts')).toBe('soft');
  });

  it('runs the most recent registered refetch and reports when none exists', async () => {
    expect(await runSoftRefresh()).toBe(false);
    const first = vi.fn();
    const second = vi.fn();
    const offFirst = registerSoftRefresh(first);
    const offSecond = registerSoftRefresh(second);
    expect(await runSoftRefresh()).toBe(true);
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
    offSecond();
    offFirst();
    expect(await runSoftRefresh()).toBe(false);
  });
});
