import Link from 'next/link';
import { Store } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const AVATAR_COLORS = [
  { bg: 'bg-purple-100', text: 'text-purple-800' },
  { bg: 'bg-teal-100',   text: 'text-teal-800'   },
  { bg: 'bg-orange-100', text: 'text-orange-800'  },
  { bg: 'bg-blue-100',   text: 'text-blue-800'    },
  { bg: 'bg-pink-100',   text: 'text-pink-800'    },
  { bg: 'bg-amber-100',  text: 'text-amber-800'   },
];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function colorFor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

async function getVendors() {
  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from('vendors')
      .select('id, store_name, logo_url, woocommerce_vendor_id')
      .eq('is_active', true)
      .not('store_name', 'is', null)
      .order('store_name', { ascending: true })
      .limit(18);
    return data || [];
  } catch {
    return [];
  }
}

export default async function VendorStrip() {
  const vendors = await getVendors();
  if (vendors.length === 0) return null;

  return (
    <section className="bg-white border-t border-gray-100 py-6 md:py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-primary-600" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-gray-900">Our Stores</h2>
          </div>
          <Link
            href="/vendors"
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2 md:gap-3">
          {vendors.map((v) => {
            const routeKey = v.woocommerce_vendor_id || `jlo-${v.id}`;
            const color = colorFor(v.store_name || '');
            const abbr = initials(v.store_name || '?');

            return (
              <Link
                key={v.id}
                href={`/vendor/${encodeURIComponent(routeKey)}`}
                className="flex flex-col items-center gap-1.5 group text-center"
              >
                {v.logo_url ? (
                  <img
                    src={v.logo_url}
                    alt={v.store_name || ''}
                    className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover border border-gray-100 group-hover:border-primary-300 transition-colors"
                  />
                ) : (
                  <div className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-xs font-semibold ${color.bg} ${color.text} group-hover:ring-2 group-hover:ring-primary-200 transition-all`}>
                    {abbr}
                  </div>
                )}
                <span className="text-xs text-gray-600 group-hover:text-primary-600 transition-colors leading-tight line-clamp-2 w-full px-0.5">
                  {v.store_name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
