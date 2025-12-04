'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle, Package, Loader2, MapPin, Truck } from 'lucide-react';
import { Order } from '@/types/order';
import { ReturnShipmentMeta } from '@/lib/woocommerce/refunds';

export default function ReturnConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = parseInt(params.orderId as string);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [shipment, setShipment] = useState<ReturnShipmentMeta | null>(null);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error('Failed to fetch order');
      const data = await res.json();
      setOrder(data.order);
      setShipment(data.returnShipment || null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load return confirmation');
      router.push(`/account/orders/${orderId}/return`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!order || !shipment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-700">Return shipment not found</p>
          <Link href={`/account/orders/${orderId}/return`} className="text-primary-600 hover:underline">
            Back to return
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <h1 className="text-xl font-bold text-gray-900">Return Instructions</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-600">Order</p>
              <p className="font-semibold text-gray-900">#{order.number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Return Code</p>
              <p className="font-semibold text-gray-900">{shipment.return_code}</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-900 font-medium">
              {shipment.method === 'pickup' ? <Truck className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              <span className="capitalize">{shipment.method}</span>
            </div>
            {shipment.method === 'pickup' ? (
              <p className="text-sm text-gray-700">
                A Fez rider will come to your address. Keep items packaged and ready with the return code.
              </p>
            ) : (
              <p className="text-sm text-gray-700">
                Drop off your package at the nearest Fez location. Provide the return code at the counter.
              </p>
            )}
            {shipment.fez_tracking ? (
              <p className="text-sm text-gray-700">
                Tracking: <span className="font-semibold">{shipment.fez_tracking}</span>
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <p className="font-semibold text-gray-900 mb-2">Packaging Instructions</p>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>Include all accessories and documentation.</li>
              <li>Use the original packaging if possible.</li>
              <li>Write the return code visibly on the package.</li>
            </ul>
          </div>

          <Link
            href={`/account/orders/${orderId}/return`}
            className="block w-full text-center py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
          >
            Back to Return Status
          </Link>
        </div>
      </div>
    </main>
  );
}
