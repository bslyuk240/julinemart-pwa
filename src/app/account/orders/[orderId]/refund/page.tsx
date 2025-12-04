'use client';

import { useParams } from 'next/navigation';
import RefundRequestForm from '@/components/refund/RefundRequestForm';

export default function RefundRequestPage() {
  const params = useParams();
  const orderId = parseInt(params.orderId as string);

  if (!orderId || isNaN(orderId)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Invalid order ID</p>
      </div>
    );
  }

  return <RefundRequestForm orderId={orderId} />;
}