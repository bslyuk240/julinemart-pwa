'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Heart, Store } from 'lucide-react';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { supabase } from '@/lib/supabase/client';
import PageLoading from '@/components/ui/page-loading';
import FollowStoreButton from '@/components/vendor/FollowStoreButton';

type FollowedStore = {
  id: string;
  vendor_id: string;
  store_name: string;
  store_logo: string | null;
  followed_at: string;
};

export default function FollowingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useCustomerAuth();
  const [stores, setStores] = useState<FollowedStore[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFollowing = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/account/following', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setStores(json.stores || []);
      } else {
        setStores([]);
      }
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) loadFollowing();
  }, [isAuthenticated, isLoading, loadFollowing, router]);

  if (isLoading || loading) {
    return <PageLoading text="Loading followed stores..." />;
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="mx-auto max-w-lg px-4 py-5 md:max-w-3xl">
        <div className="mb-5 flex items-center gap-3">
          <Link
            href="/account"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700"
            aria-label="Back to account"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Following</h1>
            <p className="text-sm text-gray-600">Stores you follow on JulineMart</p>
          </div>
        </div>

        {stores.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <Heart className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <h2 className="text-base font-semibold text-gray-900">No followed stores yet</h2>
            <p className="mt-2 text-sm text-gray-600">
              Follow local stores to find them quickly and get updates.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Browse stores
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {stores.map((store) => (
              <li
                key={store.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <Link
                  href={`/vendor/${encodeURIComponent(store.vendor_id)}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-50 ring-2 ring-gray-100">
                    {store.store_logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.store_logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-6 w-6 text-primary-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{store.store_name}</p>
                    <p className="text-xs text-gray-500">
                      Followed {new Date(store.followed_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
                <FollowStoreButton
                  vendorId={store.vendor_id}
                  vendorName={store.store_name}
                  className="flex-shrink-0 px-3"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
