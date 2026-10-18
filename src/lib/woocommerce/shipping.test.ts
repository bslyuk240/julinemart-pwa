import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const zones = [
  {
    zone: { id: 1, name: 'North Central', order: 0 },
    methods: [{ instance_id: 2, title: 'JLO Shipping', method_id: 'jlo_shipping' }],
    locations: [],
  },
];

const ok = () => new Response(JSON.stringify({ success: true, data: zones }), { status: 200 });
const fail = () => new Response(JSON.stringify({ success: false, message: 'fetch failed' }), { status: 500 });

// The module keeps a per-page cache, so each test loads a fresh copy.
async function loadShipping() {
  vi.resetModules();
  return import('./shipping');
}

describe('getAllShippingMethods', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('retries after a failed fetch instead of caching the failure', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(fail()).mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', fetchMock);
    const { getAllShippingMethods } = await loadShipping();

    expect(await getAllShippingMethods()).toEqual([]);
    expect(await getAllShippingMethods()).toEqual(zones);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries when JLO answers success: false', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false }), { status: 200 }))
      .mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', fetchMock);
    const { getAllShippingMethods } = await loadShipping();

    expect(await getAllShippingMethods()).toEqual([]);
    expect(await getAllShippingMethods()).toEqual(zones);
  });

  it('caches a successful load', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => ok());
    vi.stubGlobal('fetch', fetchMock);
    const { getAllShippingMethods } = await loadShipping();

    await getAllShippingMethods();
    await getAllShippingMethods();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
