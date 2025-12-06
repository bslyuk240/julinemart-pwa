'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Package, ArrowLeft } from 'lucide-react';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { JloReturn, formatJloRefundStatus, formatJloReturnStatus } from '@/lib/jlo/returns';
import { formatPrice } from '@/lib/utils/format-price';
import { toast } from 'sonner';

export default function ReturnsPage() {
  const router = useRouter();
  const { customerId, isAuthenticated, isLoading } = useCustomerAuth();
  const [returns, setReturns] = useState<JloReturn[]>([]);
  const [loading, setLoading] = useState(true);

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
              const refundDisplay = formatJloRefundStatus(item.refund_status || 'none');
              const returnCode = item.return_shipment?.return_code || item.return_code || '--';
              const tracking = item.return_shipment?.tracking_number || null;

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
                        href={`/account/orders/${item.order_id}/return`}
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
                          <Link
                            href={`/returns/${returnRequestId}/track`}
                            className="text-primary-600 text-sm font-medium hover:underline"
                          >
                            Track
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusDisplay.bgColor} ${statusDisplay.color}`}>
                      {statusDisplay.label}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${refundDisplay.bgColor} ${refundDisplay.color}`}>
                      Refund: {refundDisplay.label}
                    </span>
                    {item.preferred_resolution ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                        {item.preferred_resolution}
                      </span>
                    ) : null}
                  </div>

                  {item.refund_amount ? (
                    <p className="text-sm text-gray-700 mt-2">
                      Refund Amount:{' '}
                      <span className="font-semibold">
                        {formatPrice(item.refund_amount, item.refund_currency || 'NGN')}
                      </span>
                    </p>
                  ) : null}

                  {tracking || returnCode ? (
                    <p className="text-sm text-gray-700 mt-1">
                      Shipment: <span className="font-semibold">{tracking ? tracking : returnCode}</span>
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
