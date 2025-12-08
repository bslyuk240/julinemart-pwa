'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Package, ArrowLeft } from 'lucide-react';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { JloReturn, formatJloReturnStatus, buildFezTrackingUrl } from '@/lib/jlo/returns';
import { formatPrice } from '@/lib/utils/format-price';
import { toast } from 'sonner';

export default function ReturnsPage() {
  const router = useRouter();
  const { customerId, isAuthenticated, isLoading } = useCustomerAuth();
  const [returns, setReturns] = useState<JloReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const enrichedIds = useState<Set<string>>(() => new Set())[0];

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !customerId) {
        router.push('/login?redirect=/account/returns');
      } else {
        loadReturns(customerId);
      }
    }
  }, [customerId, isAuthenticated, isLoading]);

  const loadReturns = async (id: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/returns?wc_customer_id=${id}`);
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
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/account" className="text-gray-600 hover:text-primary-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Returns</h1>
            <p className="text-gray-600 text-sm">Track the status of your return requests</p>
          </div>
        </div>

        {returns.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Package className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-800 font-semibold mb-1">No returns yet</p>
            <p className="text-gray-600 text-sm mb-4">You can request a return from an eligible order&apos;s detail page.</p>
            <Link
              href="/orders"
              className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              View Orders
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
                <div key={returnRequestId} className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-gray-100">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-600">Order #{item.order_number || item.order_id}</p>
                      <p className="text-base font-semibold text-gray-900">Return {String(returnRequestId).slice(0, 8)}</p>
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
                      {returnRequestId ? (
                        <>
                          <Link
                            href={`/returns/${returnRequestId}/add-tracking`}
                            className="text-primary-600 text-sm font-medium hover:underline"
                          >
                            Add tracking
                          </Link>
                          {fezTrackingUrl ? (
                            <a
                              href={fezTrackingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary-600 text-sm font-medium hover:underline"
                            >
                              Track
                            </a>
                          ) : (
                            <Link
                              href={`/returns/${returnRequestId}/track`}
                              className="text-primary-600 text-sm font-medium hover:underline"
                            >
                              Track
                            </Link>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusDisplay.bgColor} ${statusDisplay.color}`}>
                      {statusDisplay.label}
                    </span>
                    {item.preferred_resolution ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                        {item.preferred_resolution}
                      </span>
                    ) : null}
                    {item.refund_amount && item.refund_completed_at ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        Refunded {formatPrice(item.refund_amount, item.refund_currency || 'NGN')} on{' '}
                        {new Date(item.refund_completed_at).toLocaleDateString()}
                      </span>
                    ) : null}
                  </div>

                  {item.refund_amount ? (
                    <p className="text-sm text-gray-700 mt-2">
                      Refund:{' '}
                      <span className="font-semibold">
                        {formatPrice(item.refund_amount, item.refund_currency || 'NGN')}
                      </span>
                      {item.refund_completed_at ? (
                        <span className="text-xs text-gray-500 ml-2">
                          Refunded {new Date(item.refund_completed_at).toLocaleString()}
                        </span>
                      ) : null}
                    </p>
                  ) : null}

                  <p className="text-sm text-gray-700 mt-1">
                    Shipment:{' '}
                    <span className="font-semibold">
                      {fezTrackingUrl ? (
                        <a
                          href={fezTrackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 hover:underline"
                        >
                          {shipmentLabel}
                        </a>
                      ) : (
                        shipmentLabel
                      )}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
