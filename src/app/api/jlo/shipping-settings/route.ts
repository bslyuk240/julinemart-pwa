import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

type JloZone = {
  id: string;
  name: string;
  code: string;
  order?: number | null;
  states?: string[] | null;
  estimated_delivery_days?: number | null;
  description?: string | null;
};

type JloRate = {
  id: string;
  zone_id: string;
  courier_id?: string | null;
  flat_rate?: string | number | null;
  free_shipping_threshold?: string | number | null;
  is_active?: boolean | null;
  priority?: number | null;
};

const stableNumericId = (value: string, fallback = 0) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  const normalized = Math.abs(hash);
  return normalized > 0 ? normalized : fallback;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function GET() {
  try {
    if (!JLO_BASE) {
      return NextResponse.json(
        { success: false, message: 'JLO shipping service not configured' },
        { status: 503 }
      );
    }

    const [zonesRes, ratesRes] = await Promise.all([
      fetch(`${JLO_BASE}/.netlify/functions/zones`, { cache: 'no-store' }),
      fetch(`${JLO_BASE}/.netlify/functions/shipping-rates`, { cache: 'no-store' }),
    ]);

    const [zonesPayload, ratesPayload] = await Promise.all([
      zonesRes.json().catch(() => ({})),
      ratesRes.json().catch(() => ({})),
    ]);

    const zones: JloZone[] = Array.isArray(zonesPayload?.data) ? zonesPayload.data : [];
    const rates: JloRate[] = Array.isArray(ratesPayload?.data) ? ratesPayload.data : [];

    const data = zones
      .map((zone, index) => {
        const zoneRates = rates
          .filter((rate) => rate.zone_id === zone.id && rate.is_active !== false)
          .sort((a, b) => {
            const priorityDiff = toNumber(a.priority) - toNumber(b.priority);
            if (priorityDiff !== 0) return priorityDiff;
            return toNumber(a.flat_rate) - toNumber(b.flat_rate);
          });

        if (zoneRates.length === 0) {
          return null;
        }

        const representativeRate = zoneRates[0];
        const baseRate = Math.min(...zoneRates.map((rate) => toNumber(rate.flat_rate)));
        const freeShippingThresholds = zoneRates
          .map((rate) => toNumber(rate.free_shipping_threshold, 0))
          .filter((value) => value > 0);
        const freeShippingThreshold =
          freeShippingThresholds.length > 0 ? Math.max(...freeShippingThresholds) : 0;
        const estimatedDays = zone.estimated_delivery_days ?? 3;

        return {
          zone: {
            id: stableNumericId(zone.id, index + 1),
            name: zone.name,
            order: zone.order ?? index,
          },
          methods: [
            {
              instance_id: stableNumericId(`${zone.id}:${representativeRate.id}`, index + 1),
              title: 'JLO Shipping',
              order: 0,
              enabled: true,
              method_id: 'jlo_shipping',
              method_title: 'JLO Shipping',
              method_description:
                zone.description ||
                `Calculated by JLO for ${zone.name}${estimatedDays ? ` - Est. ${estimatedDays} days` : ''}`,
              settings: {
                cost: {
                  id: 'cost',
                  label: 'Estimated cost',
                  description: '',
                  type: 'price',
                  value: String(baseRate),
                  default: String(baseRate),
                  tip: '',
                  placeholder: '',
                },
                min_amount: {
                  id: 'min_amount',
                  label: 'Free shipping threshold',
                  description: '',
                  type: 'price',
                  value: String(freeShippingThreshold),
                  default: String(freeShippingThreshold),
                  tip: '',
                  placeholder: '',
                },
                estimated_delivery: {
                  id: 'estimated_delivery',
                  label: 'Estimated delivery',
                  description: '',
                  type: 'text',
                  value: estimatedDays ? `${estimatedDays} day${estimatedDays === 1 ? '' : 's'}` : '',
                  default: estimatedDays ? `${estimatedDays} day${estimatedDays === 1 ? '' : 's'}` : '',
                  tip: '',
                  placeholder: '',
                },
              },
            },
          ],
          locations: Array.isArray(zone.states)
            ? zone.states.map((state) => ({ code: state, type: 'state' }))
            : [],
        };
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to load shipping settings' },
      { status: 500 }
    );
  }
}

