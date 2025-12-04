'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Package, Truck, MapPin, Loader2 } from 'lucide-react';
import ReturnMethodCard from '@/components/return/ReturnMethodCard';
import { Order } from '@/types/order';
import { ReturnShipmentMeta } from '@/lib/woocommerce/refunds';

type Method = 'pickup' | 'dropoff';

export default function ReturnMethodPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = parseInt(params.orderId as string);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shipment, setShipment] = useState<ReturnShipmentMeta | null>(null);
  const [method, setMethod] = useState<Method | null>(null);

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
      if (data.returnShipment?.method) setMethod(data.returnShipment.method);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!order) return;
    if (!method) {
      toast.error('Select a return method');
      return;
    }

    try {
      setSubmitting(true);
      const customer = {
        name: `${order.shipping.first_name || order.billing.first_name} ${
          order.shipping.last_name || order.billing.last_name
        }`.trim(),
        phone: order.billing.phone,
        address: order.shipping.address_1 || order.billing.address_1,
        city: order.shipping.city || order.billing.city,
        state: order.shipping.state || order.billing.state,
      };

      const hub = {
        name: 'JulineMart Returns',
        phone: order.billing.phone,
        address: order.billing.address_1,
        city: order.billing.city,
        state: order.billing.state,
      };

      const res = await fetch(`/api/orders/${order.id}/return-shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, customer, hub }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to set return method');
      }

      toast.success('Return method saved');
      router.push(`/account/orders/${order.id}/return/confirmation`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to save return method');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-700">Order not found</p>
          <Link href="/orders" className="text-primary-600 hover:underline">
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/account/orders/${orderId}/return`} className="text-gray-600 hover:text-primary-600">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Choose Return Method</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <ReturnMethodCard
            title="Request Pickup (Fez Rider)"
            description="A Fez rider picks up from your address."
            icon={<Truck className="w-6 h-6" />}
            selected={method === 'pickup'}
            onClick={() => setMethod('pickup')}
          />

          <ReturnMethodCard
            title="Drop off at Fez Location"
            description="Take items to the nearest Fez drop-off point."
            icon={<MapPin className="w-6 h-6" />}
            selected={method === 'dropoff'}
            onClick={() => setMethod('dropoff')}
          />

          {shipment ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-semibold">Current selection</p>
              <p className="mt-1 capitalize">Method: {shipment.method}</p>
              <p>Return Code: {shipment.return_code}</p>
              {shipment.fez_tracking ? <p>Tracking: {shipment.fez_tracking}</p> : null}
            </div>
          ) : null}

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold disabled:opacity-60"
          >
            {submitting ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </main>
  );
}
