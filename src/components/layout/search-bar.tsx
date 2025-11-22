'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { searchProducts } from '@/lib/woocommerce/products';
import { Product } from '@/types/product';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setIsSearching(true);
        const data = await searchProducts(query.trim(), { per_page: 6 });
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleClear = () => {
    setQuery('');
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
      <div
        className={clsx(
          'relative flex items-center transition-all duration-200',
          isFocused && 'ring-2 ring-primary-500 rounded-lg'
        )}
      >
        <Search className="absolute left-3 w-5 h-5 text-gray-400" />
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search for products, brands and categories..."
          className="w-full pl-10 pr-20 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-transparent transition-colors"
        />

        {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-20 p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      )}

      <button
        type="submit"
        className="absolute right-2 bg-secondary-500 hover:bg-secondary-600 text-white px-4 py-2 rounded-md transition-colors font-medium"
      >
        Search
      </button>
    </div>

    {/* Search Suggestions Dropdown (Optional) */}
    {isFocused && query && (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
        <div className="p-3 space-y-2">
          {isSearching && <p className="text-sm text-gray-500">Searching...</p>}

          {!isSearching && results.length === 0 && (
            <p className="text-sm text-gray-500">No products found</p>
          )}

          {results.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => router.push(`/product/${product.slug}`)}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 flex items-center justify-between gap-2"
            >
              <span className="text-sm text-gray-900 line-clamp-1">{product.name}</span>
              <span className="text-xs text-primary-600 font-semibold">
                {product.price ? `₦${Number(product.price).toLocaleString()}` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    )}
  </form>
);
}
