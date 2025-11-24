'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Menu, ShoppingCart, MessageCircle } from 'lucide-react';
import MobileMenu from '@/components/layout/mobile-menu';
import { useCart } from '@/hooks/use-cart';
import { searchProducts } from '@/lib/woocommerce/products';
import { Product } from '@/types/product';
import { useRouter } from 'next/navigation';

// WhatsApp configuration
const WHATSAPP_NUMBER = '2347075825761';
const WHATSAPP_MESSAGE = 'Hello! I need help with shopping on JulineMart.';

// Banner data interface
interface BannerData {
  enabled: boolean;
  text: string;
  background_color: string;
  text_color: string;
}

export default function Header() {
  const logoSrc = process.env.NEXT_PUBLIC_LOGO_URL || '/images/logo.png';
  const logoWidth = Number(process.env.NEXT_PUBLIC_LOGO_WIDTH) || 40;
  const logoHeight = Number(process.env.NEXT_PUBLIC_LOGO_HEIGHT) || 40;
  const logoAlt = process.env.NEXT_PUBLIC_LOGO_TEXT || 'Home';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { itemCount } = useCart();
  const router = useRouter();

  // ==================== BANNER STATE (NEW!) ====================
  const [banner, setBanner] = useState<BannerData>({
    enabled: true,
    text: 'Free Shipping on Orders Over ₦10,000 🎉',
    background_color: '#77088a',
    text_color: '#ffffff',
  });
  const [bannerLoading, setBannerLoading] = useState(true);
  // =============================================================

  useEffect(() => {
    router.prefetch('/');
  }, [router]);

  // ==================== FETCH BANNER FROM WORDPRESS (NEW!) ====================
  useEffect(() => {
    async function fetchBanner() {
      try {
        console.log('📢 Fetching banner from WordPress...');
        const response = await fetch('/api/pwa-settings');
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.banner && Object.keys(data.banner).length > 0) {
            console.log('✅ WordPress banner loaded:', data.banner);
            setBanner({
              enabled: data.banner.enabled ?? true,
              text: data.banner.text || 'Free Shipping on Orders Over ₦10,000 🎉',
              background_color: data.banner.background_color || '#77088a',
              text_color: data.banner.text_color || '#ffffff',
            });
          } else {
            console.log('⚠️ No WordPress banner found, using default');
          }
        } else {
          console.log('⚠️ WordPress API failed, using default banner');
        }
      } catch (error) {
        console.error('❌ Error fetching banner:', error);
      } finally {
        setBannerLoading(false);
      }
    }

    fetchBanner();
  }, []);
  // ============================================================================

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsFocused(false);
    }
  };

  // WhatsApp click handler
  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(WHATSAPP_MESSAGE);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* ==================== TOP BAR - NOW DYNAMIC (UPDATED!) ==================== */}
      {!bannerLoading && banner.enabled && (
        <div 
          className="py-2 px-4 text-center text-sm"
          style={{
            backgroundColor: banner.background_color,
            color: banner.text_color,
          }}
        >
          <p>{banner.text}</p>
        </div>
      )}
      {/* ========================================================================== */}

      {/* Main Header */}
      <div className="container mx-auto px-4 py-3 md:py-4">
        {/* Unified layout: logo + search, compact and inline */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Desktop menu toggle */}
          <button
            className="hidden md:inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 border border-gray-200"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>

          <Link href="/" className="flex-shrink-0 inline-flex">
            <Image
              src={logoSrc}
              alt={logoAlt}
              width={logoWidth}
              height={logoHeight}
              priority
              className="h-9 w-auto md:h-10 object-contain"
            />
          </Link>

          <div className="relative w-full">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                  placeholder="Search for products, brands and categories..."
                  className="w-full px-4 py-2.5 pl-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-secondary-500 hover:bg-secondary-600 text-white px-5 md:px-6 py-1.5 rounded-md transition-colors"
                >
                  Search
                </button>
              </div>
            </form>

            {isFocused && query && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto z-50">
                <div className="p-3 space-y-2">
                  {isSearching && <p className="text-sm text-gray-500">Searching...</p>}
                  {!isSearching && results.length === 0 && (
                    <p className="text-sm text-gray-500">No products found</p>
                  )}
                  {results.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onMouseDown={() => router.push(`/product/${product.slug}`)}
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
          </div>

          {/* ==================== WHATSAPP ICON ==================== */}
          <button
            onClick={handleWhatsAppClick}
            className="hidden md:inline-flex items-center justify-center p-2 rounded-lg hover:bg-green-600 bg-green-500 text-white transition-colors"
            aria-label="Chat on WhatsApp"
            title="Chat with us on WhatsApp"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          {/* ======================================================= */}

          {/* Desktop cart icon */}
          <Link
            href="/cart"
            className="hidden md:inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-secondary-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </div>
            <span className="text-sm font-semibold text-gray-800">Cart</span>
          </Link>
        </div>
      </div>

      {/* Menu Drawer for desktop */}
      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} showOnDesktop />
    </header>
  );
}