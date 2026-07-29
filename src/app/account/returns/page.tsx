'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AccountPageHeader from '@/components/account/account-page-header';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { JloReturn, formatJloReturnStatus, buildFezTrackingUrl } from '@/lib/jlo/returns';
import { formatPrice } from '@/lib/utils/format-price';
import { toast } from 'sonner';

export default function ReturnsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useCustomerAuth();
  const [returns, setReturns] = useState<JloReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const enrichedIds = useState<Set<string>>(() => new Set())[0];

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user?.email) {
        router.push('/login?redirect=/account/returns');
      } else {
        loadReturns(user.email);
      }
    }
  }, [user, isAuthenticated, isLoading]);

  const loadReturns = async (email: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/returns?customer_email=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error('Failed to fetch returns');
      const json = await res.json();
      const payload = json?.data ?? json;
      const list = Array.isArray(payload) ? payload : Array.isArray(payload?.returns) ? payload.returns : [];
      setReturns(list);
    } catch (error) {
      console.error(error);
      toast.error('Could not load returns right now');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const enrichMissingShipments = async () => {
      const needsEnrich = returns.filter((r) => {
        if (enrichedIds.has(r.return_request_id)) return false;
        const missingShipment = !r.return_shipment?.tracking_number && !r.return_shipment?.return_code;
        const inProgress = ['awaiting_tracking', 'in_transit', 'delivered_to_hub', 'inspection_in_progress'].includes(
          (r.status || '').toLowerCase()
        );
        const maybeCompletedWithNoShipment =
          (r.status || '').toLowerCase() === 'completed' && !r.return_shipment?.tracking_number;
        return missingShipment || inProgress || maybeCompletedWithNoShipment;
      });
      if (!needsEnrich.length) return;
      setEnriching(true);
      try {
        const updated = await Promise.all(
          needsEnrich.map(async (r) => {
            try {
              const res = await fetch(`/api/returns/${encodeURIComponent(r.return_request_id)}/tracking`);
              const data = await res.json().catch(() => ({}));
              const payload = data?.data ?? data;
              const shipment = payload?.return_shipment;
              if (res.ok && (shipment?.return_shipment_id || payload?.status)) {
                return {
                  ...r,
                  return_shipment: shipment || r.return_shipment,
                  status: payload?.status || shipment?.status || r.status,
                  refund_status: payload?.refund_status ?? r.refund_status,
                  refund_amount: payload?.refund_amount ?? r.refund_amount,
                  refund_currency: payload?.refund_currency ?? r.refund_currency,
                };
              }
            } catch {
              /* ignore */
            }
            return r;
          })
        );
        if (updated.length) {
          setReturns((prev) =>
            prev.map((r) => updated.find((u) => u.return_request_id === r.return_request_id) || r)
          );
          updated.forEach((u) => enrichedIds.add(u.return_request_id));
        }
      } finally {
        setEnriching(false);
      }
    };
    if (returns.length) {
      enrichMissingShipments();
    }
  }, [returns, enrichedIds]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="container mx-auto px-4 py-5 md:py-6 max-w-4xl">
        <AccountPageHeader
          title="My Returns"
          subtitle="Track the status of your return requests"
        />

        {returns.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-800 font-semibold text-sm md:text-base mb-1">No returns yet</p>
            <p className="text-gray-600 text-xs md:text-sm mb-4">You can request a return from an eligible order&apos;s detail page.</p>
            <Link href="/orders">
              <Button variant="primary" size="sm">View Orders</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {returns.map((item) => {
              const returnRequestId = item.return_request_id;
              const statusDisplay = formatJloReturnStatus(item.status);
              const returnCode =
                item.return_shipment?.return_code ||
                item.return_code ||
                item.return_shipment_id ||
                null;

              const tracking =
                item.return_shipment?.tracking_number ||
                item.tracking_number ||
                null;

              const shipmentLabel =
                tracking ||
                returnCode ||
                (item.status && item.status.toLowerCase() === 'completed'
                  ? 'Completed'
                  : enriching && !enrichedIds.has(item.return_request_id)
                  ? 'Loading…'
                  : 'Awaiting tracking');
              const fezTrackingUrl = tracking ? buildFezTrackingUrl(tracking) : null;

              return (
                <div key={returnRequestId} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-600">Order #{item.order_number || item.order_id}</p>
                      <p className="text-sm md:text-base font-semibold text-gray-900">Return {String(returnRequestId).slice(0, 8)}</p>
                      {item.created_at ? (
                        <p className="text-xs text-gray-500">Requested {new Date(item.created_at).toLocaleString()}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Link
                        href={`/returns/${returnRequestId}/track`}
                        className="text-primary-600 text-sm font-medium hover:underline"
                      >
                        View
                      </Link>
                      {returnRequestId && fezTrackingUrl ? (
                        <a
                          href={fezTrackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 text-sm font-medium hover:underline"
                        >
                          Track
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusDisplay.bgColor} ${statusDisplay.color}`}>
                      {statusDisplay.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
