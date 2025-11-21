'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

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
          <div className="p-4">
            <p className="text-sm text-gray-500">Search suggestions will appear here...</p>
          </div>
        </div>
      )}
    </form>
  );
}
