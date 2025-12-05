'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ReturnMethodRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  useEffect(() => {
    if (orderId) {
      router.replace(`/account/orders/${orderId}/return`);
    } else {
      router.replace('/orders');
    }
  }, [orderId, router]);

  return null;
}
