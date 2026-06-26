import Link from 'next/link';
import { Store, ArrowLeft } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const revalidate = 300;

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
      .select('id, store_name, logo_url, description, woocommerce_vendor_id, city, state')
      .eq('is_active', true)
      .not('store_name', 'is', null)
      .order('store_name', { ascending: true });
    return data || [];
  } catch {
    return [];
  }
}

export default async function VendorsPage() {
  const vendors = await getVendors();

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6 max-w-6xl">

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary-600 p-2 rounded-lg">
              <Store className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Our Stores</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Shop directly from {vendors.length} verified vendors on JulineMart
          </p>
        </div>

        {vendors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
            <Store className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No stores available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {vendors.map((v) => {
              const routeKey = v.woocommerce_vendor_id || `jlo-${v.id}`;
              const color = colorFor(v.store_name || '');
              const abbr = initials(v.store_name || '?');
              const location = [v.city, v.state].filter(Boolean).join(', ');

              return (
                <Link
                  key={v.id}
                  href={`/vendor/${encodeURIComponent(routeKey)}`}
                  className="group bg-white rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all p-4 flex flex-col items-start gap-3"
                >
                  {v.logo_url ? (
                    <img
                      src={v.logo_url}
                      alt={v.store_name || ''}
                      className="w-11 h-11 rounded-full object-cover border border-gray-100"
                    />
                  ) : (
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold ${color.bg} ${color.text}`}>
                      {abbr}
                    </div>
                  )}
                  <div className="min-w-0 w-full">
                    <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {v.store_name}
                    </p>
                    {location && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{location}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
