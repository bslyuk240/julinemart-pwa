'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/types/product';

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: Error | null;
}

export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    // Placeholder for future API integration
    setProducts([]);
    setLoading(false);
  }, []);

  return { products, loading, error };
}
