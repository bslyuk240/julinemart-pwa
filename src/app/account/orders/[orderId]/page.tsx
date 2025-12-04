'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function AccountOrderRedirect() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  useEffect(() => {
    if (orderId) {
      router.replace(`/orders/${orderId}`);
    } else {
      router.replace('/orders');
    }
  }, [router, orderId]);

  return null;
}
