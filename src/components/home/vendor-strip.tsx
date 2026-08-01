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
    <section className="bg-gray-50 border-t border-b border-gray-200 py-6 md:py-8">
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

        <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-nowrap gap-3 pb-1 md:gap-4">
            {vendors.map((v) => {
              const routeKey = v.woocommerce_vendor_id || `jlo-${v.id}`;
              const color = colorFor(v.store_name || '');
              const abbr = initials(v.store_name || '?');

              return (
                <Link
                  key={v.id}
                  href={`/vendor/${encodeURIComponent(routeKey)}`}
                  className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center md:w-20"
                >
                  {v.logo_url ? (
                    <img
                      src={v.logo_url}
                      alt={v.store_name || ''}
                      className="h-10 w-10 rounded-full border border-gray-100 object-cover transition-colors group-hover:border-primary-300 md:h-11 md:w-11"
                    />
                  ) : (
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold transition-all group-hover:ring-2 group-hover:ring-primary-200 md:h-11 md:w-11 ${color.bg} ${color.text}`}
                    >
                      {abbr}
                    </div>
                  )}
                  <span className="line-clamp-2 w-full px-0.5 text-xs leading-tight text-gray-600 transition-colors group-hover:text-primary-600">
                    {v.store_name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
