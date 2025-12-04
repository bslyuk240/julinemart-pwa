'use client';

import { useParams } from 'next/navigation';
import ReturnRequestForm from '@/components/return/ReturnRequestForm';

export default function ReturnRequestPage() {
  const params = useParams();
  const orderId = parseInt(params.orderId as string);

  if (!orderId || isNaN(orderId)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Invalid order ID</p>
      </div>
    );
  }

  return <ReturnRequestForm orderId={orderId} />;
}
