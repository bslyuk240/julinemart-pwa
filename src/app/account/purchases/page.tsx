'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Receipt,
  Phone,
  Mail,
  Store,
  AlertCircle,
  Package,
} from 'lucide-react';
import AccountPageHeader from '@/components/account/account-page-header';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { supabase } from '@/lib/supabase/client';
import PageLoading from '@/components/ui/page-loading';
import { toast } from 'sonner';
import {
  formatExpiryDate,
  formatWarrantySummary,
  getWarrantyStatus,
  WARRANTY_STATUS_STYLES,
} from '@/lib/warranty';

type PurchaseRecord = {
  id: string;
  order_id: string;
  order_number: number | string;
  product_name: string;
  product_sku?: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  purchased_at: string;
  delivered_at?: string | null;
  payment_reference?: string | null;
  warranty_type?: string | null;
  warranty_months?: number | null;
  warranty_expires_at?: string | null;
  vendor?: {
    store_name?: string;
    phone?: string;
    email?: string;
    storefront_id?: string;
  } | null;
};

function formatPrice(amount: number) {
  return `₦${(Number(amount) || 0).toLocaleString()}`;
}

export default function PurchasesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/account/purchases');
      } else {
        loadPurchases();
      }
    }
  }, [authLoading, isAuthenticated, user?.email]);

  const loadPurchases = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/account/purchases', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      setPurchases(json.purchases || []);
    } catch {
      toast.error('Could not load purchases');
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <PageLoading text="Loading your purchases..." />;
  }

  const withWarranty = purchases.filter((p) => p.warranty_type && p.warranty_type !== 'none');

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container-custom py-5 md:py-6">
        <AccountPageHeader
          title="My Purchases"
          subtitle="Digital receipts, warranty coverage, and seller contact for items you've received."
          action={(
            <div className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm">
              <Package className="h-3.5 w-3.5 text-primary-600" />
              <span>{purchases.length}</span>
            </div>
          )}
        />

        {withWarranty.length > 0 && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-900">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
            <p>
              {withWarranty.length} item{withWarranty.length === 1 ? '' : 's'} with warranty coverage.
              Claims go through the same secure returns flow.
            </p>
          </div>
        )}

        {purchases.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
            <Receipt className="mx-auto mb-3 h-12 w-12 text-gray-200" />
            <p className="text-gray-600 mb-2">No delivered purchases yet.</p>
            <Link href="/" className="text-sm font-semibold text-primary-600 hover:underline">
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {purchases.map((item) => {
              const warrantyStatus = getWarrantyStatus(item.warranty_type, item.warranty_expires_at);
              const statusStyle = WARRANTY_STATUS_STYLES[warrantyStatus];
              const warrantySummary = formatWarrantySummary(item.warranty_type, item.warranty_months);
              const orderRef = String(item.order_number);
              const claimHref = `/account/orders/${orderRef}/return?complaint_type=not_as_described&reason=warranty`;

              return (
                <li
                  key={item.id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-900 truncate">{item.product_name}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Order #{item.order_number} · Qty {item.quantity} · {formatPrice(item.subtotal)}
                      </p>
                      {item.product_sku && (
                        <p className="text-xs text-gray-400 mt-0.5">SKU {item.product_sku}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.className}`}>
                      {statusStyle.label}
                    </span>
                  </div>

                  {warrantySummary && (
                    <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-sm">
                      <p className="font-medium text-gray-800">{warrantySummary}</p>
                      {item.warranty_expires_at && warrantyStatus !== 'none' && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {warrantyStatus === 'expired' ? 'Expired' : 'Expires'}{' '}
                          {formatExpiryDate(item.warranty_expires_at)}
                        </p>
                      )}
                    </div>
                  )}

                  {item.vendor?.store_name && (
                    <p className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                      <Store className="h-3.5 w-3.5" />
                      Sold by {item.vendor.store_name}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/orders/${item.order_id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-800"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      View receipt
                    </Link>
                    {item.vendor?.storefront_id && (
                      <Link
                        href={`/vendor/${item.vendor.storefront_id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-primary-600"
                      >
                        <Store className="h-3.5 w-3.5" />
                        Seller store
                      </Link>
                    )}
                    {item.vendor?.phone && (
                      <a
                        href={`tel:${item.vendor.phone}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Call seller
                      </a>
                    )}
                    {item.vendor?.email && (
                      <a
                        href={`mailto:${item.vendor.email}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </a>
                    )}
                    {warrantyStatus === 'active' || warrantyStatus === 'expiring' ? (
                      <Link
                        href={claimHref}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        Warranty claim
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
