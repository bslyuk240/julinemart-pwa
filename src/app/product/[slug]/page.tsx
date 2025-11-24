'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Star, ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw, Minus, Plus, Store, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductGallery from '@/components/product/product-gallery';
import ProductCarousel from '@/components/product/product-carousel';
import { Badge } from '@/components/ui/badge';
import { getProductBySlug, getRelatedProducts } from '@/lib/woocommerce/products';
import ProductFeatures from '@/components/product/product-features';
import { useCartStore } from '@/store/cart-store';
import { useWishlist } from '@/hooks/use-wishlist';
import { Product } from '@/types/product';

// Badge configuration helper
const getBadgeConfig = (tagSlug: string) => {
  const configs: Record<string, { label: string; bgColor: string }> = {
    'flash-sale': { label: 'Flash Sale', bgColor: 'bg-red-500' },
    'deal': { label: 'Deal', bgColor: 'bg-orange-500' },
    'featured': { label: 'Featured', bgColor: 'bg-purple-500' },
    'new-arrival': { label: 'New', bgColor: 'bg-green-500' },
    'black-friday': { label: 'Black Friday deal', bgColor: 'bg-black' },
  };
  return configs[tagSlug] || { label: tagSlug, bgColor: 'bg-gray-500' };
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [showShareMenu, setShowShareMenu] = useState(false);

  const addToCart = useCartStore((state) => state.addItem);
  const { toggleWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const fetchedProduct = await getProductBySlug(slug);
      
      if (!fetchedProduct) {
        setProduct(null);
        setLoading(false);
        return;
      }
      
      setProduct(fetchedProduct);
    } catch (error) {
      console.error('Error fetching product:', error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  // fetch related after product is set to avoid blocking initial render
  useEffect(() => {
    const fetchRelated = async () => {
      if (!product) return;
      try {
        const related = await getRelatedProducts(product.id, 6);
        setRelatedProducts(related);
      } catch (error) {
        console.error('Error fetching related products:', error);
      }
    };
    fetchRelated();
  }, [product]);

  const formatPrice = (price: string) => {
    return `₦${parseFloat(price).toLocaleString()}`;
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    console.log('Adding to cart:', product);
    addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    // Add to cart first
    addToCart(product, quantity);
    
    // Redirect to checkout
    router.push('/checkout');
  };

  const handleWishlist = () => {
    if (!product) return;
    
    toggleWishlist(product.id, {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: product.images[0]?.src || '/images/placeholder.jpg',
    });
  };

  const handleShare = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.name,
          text: product.short_description.replace(/<[^>]*>/g, ''),
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleFacebookShare = () => {
    if (!product) return;
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
  };

  const handleWhatsAppShare = () => {
    if (!product) return;
    const text = encodeURIComponent(`Check out ${product.name} - ${formatPrice(product.price)}\n${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleTwitterShare = () => {
    if (!product) return;
    const text = encodeURIComponent(`Check out ${product.name} on JulineMart!`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };

  const increaseQuantity = () => {
    if (product && product.stock_quantity && quantity < product.stock_quantity) {
      setQuantity(quantity + 1);
    } else if (!product?.stock_quantity) {
      setQuantity(quantity + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white pb-24 md:pb-8">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading product...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-white pb-24 md:pb-8">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-20">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Not Found</h1>
            <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
            <a
              href="/"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
      </main>
    );
  }

  const discountPercentage = product.on_sale && product.regular_price
    ? Math.round(((parseFloat(product.regular_price) - parseFloat(product.price)) / parseFloat(product.regular_price)) * 100)
    : 0;

  const inWishlist = isInWishlist(product.id);

  return (
    <main className="min-h-screen bg-white pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-4">
          <a href="/" className="hover:text-primary-600">Home</a>
          <span className="mx-2">/</span>
          {product.categories && product.categories.length > 0 && (
            <>
              <a href={`/category/${product.categories[0].slug}`} className="hover:text-primary-600">
                {product.categories[0].name}
              </a>
              <span className="mx-2">/</span>
            </>
          )}
          <span className="text-gray-900">{product.name}</span>
        </nav>

        {/* ==================== PRODUCT BADGES (LIKE JUMIA) ==================== */}
        {product.tags && product.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {/* Official Store Badge */}
            {product.tags.some(tag => tag.slug === 'official-store') && (
              <div className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs md:text-sm font-semibold px-3 py-1.5 rounded-md shadow-sm">
                <BadgeCheck className="w-4 h-4" />
                Official Store
              </div>
            )}
            
            {/* Product Tag Badges */}
            {product.tags
              .filter(tag => ['flash-sale', 'deal', 'featured', 'new-arrival', 'black-friday'].includes(tag.slug))
              .map((tag) => {
                const config = getBadgeConfig(tag.slug);
                return (
                  <div
                    key={tag.id}
                    className={`${config.bgColor} text-white text-xs md:text-sm font-semibold px-3 py-1.5 rounded-md shadow-sm`}
                  >
                    {config.label}
                  </div>
                );
              })}
          </div>
        )}
        {/* ====================================================================== */}

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-10">
          {/* Product Gallery */}
          <div>
            <ProductGallery images={product.images} productName={product.name} />
          </div>

          {/* Product Info */}
          <div className="space-y-5">
            <div>
              {/* Vendor Badge */}
              {product.store && (
                <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full mb-3">
                  <Store className="w-4 h-4 text-gray-600" />
                  <a 
                    href={`/vendor/${product.store.id}`}
                    className="text-sm text-gray-700 hover:text-primary-600 font-medium"
                  >
                    {product.store.shop_name || product.store.name || (product.store.url ? product.store.url.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Vendor Store')}
                  </a>
                </div>
              )}

              <h1 className="text-lg md:text-2xl font-bold text-gray-900 mb-2 leading-tight line-clamp-2">
                {product.name}
              </h1>
              
              {/* Rating */}
              {product.average_rating && parseFloat(product.average_rating) > 0 && (
                <div className="flex items-center gap-2 md:gap-3 mb-3">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 md:w-5 md:h-5 ${
                          i < Math.floor(parseFloat(product.average_rating))
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {product.average_rating} ({product.rating_count || 0} reviews)
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl md:text-2xl font-bold text-primary-600">
                  {formatPrice(product.price)}
                </span>
                {product.on_sale && product.regular_price && (
                  <>
                    <span className="text-base md:text-lg text-gray-400 line-through">
                      {formatPrice(product.regular_price)}
                    </span>
                    <Badge variant="danger">
                      -{discountPercentage}% OFF
                    </Badge>
                  </>
                )}
              </div>

              {/* Stock Status */}
              {product.stock_status === 'instock' ? (
                <div className="flex items-center gap-2 mb-4 md:mb-5">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-green-600 font-medium text-sm md:text-base">In Stock</p>
                  {product.stock_quantity && (
                    <span className="text-gray-500 text-xs md:text-sm">({product.stock_quantity} available)</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-4 md:mb-5">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <p className="text-red-600 font-medium text-sm md:text-base">Out of Stock</p>
                </div>
              )}
            </div>

            {/* Short Description */}
            {product.short_description && (
              <div 
                className="prose prose-sm text-gray-700 border-t pt-5 line-clamp-4 overflow-hidden"
                dangerouslySetInnerHTML={{ __html: product.short_description }}
              />
            )}

            {/* Quantity Selector */}
            {product.stock_status === 'instock' && (
              <div className="border-t pt-4 md:pt-6">
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                  Quantity:
                </label>
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={decreaseQuantity}
                      className="p-2 hover:bg-gray-100"
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1.5 md:px-4 md:py-2 font-medium text-sm md:text-base">{quantity}</span>
                    <button
                      onClick={increaseQuantity}
                      className="p-2 hover:bg-gray-100"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {product.stock_quantity && (
                    <span className="text-sm text-gray-600">
                      {product.stock_quantity} available
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Add to Cart Section */}
            <div className="space-y-3 md:space-y-4 border-t pt-4 md:pt-6">
              <div className="flex gap-3 md:gap-4">
                <Button
                  onClick={handleAddToCart}
                  variant="primary"
                  size="md"
                  fullWidth
                  disabled={product.stock_status === 'outofstock'}
                  className="flex-1 text-sm md:text-base"
                >
                  <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Add to Cart
                </Button>
                
                <Button 
                  onClick={handleWishlist}
                  variant={inWishlist ? "primary" : "outline"}
                  size="md"
                >
                  <Heart className={`w-4 h-4 md:w-5 md:h-5 ${inWishlist ? 'fill-current' : ''}`} />
                </Button>
                
                {/* Share Dropdown */}
                <div className="relative">
                  <Button 
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    variant="outline" 
                    size="md"
                  >
                    <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                  
                  {/* Share Menu */}
                  {showShareMenu && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowShareMenu(false)}
                      />
                      
                      {/* Menu */}
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
                        <button
                          onClick={() => {
                            handleFacebookShare();
                            setShowShareMenu(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                        >
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          <span className="font-medium text-gray-900">Facebook</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            handleWhatsAppShare();
                            setShowShareMenu(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                        >
                          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                          <span className="font-medium text-gray-900">WhatsApp</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            handleTwitterShare();
                            setShowShareMenu(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                        >
                          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                          </svg>
                          <span className="font-medium text-gray-900">Twitter</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            handleCopyLink();
                            setShowShareMenu(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors border-t border-gray-100"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium text-gray-900">Copy Link</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleBuyNow}
                variant="secondary" 
                size="md" 
                fullWidth
                disabled={product.stock_status === 'outofstock'}
                className="text-sm md:text-base"
              >
                Buy Now
              </Button>
            </div>

            {/* Features */}
            <ProductFeatures className="border-t pt-6" />

            {/* Vendor Info Card */}
            {product.store && (
              <div className="border-t pt-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Store className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">Sold by</p>
                      <a 
                        href={`/vendor/${product.store.id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors block mb-2"
                      >
                        {product.store.shop_name || product.store.name || (product.store.url ? product.store.url.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Vendor Store')}
                      </a>
                      <a 
                        href={`/vendor/${product.store.id}`}
                        className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View All Products →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t pt-8 mb-12">
          <div className="flex gap-8 border-b mb-6">
            <button
              onClick={() => setActiveTab('description')}
              className={`pb-3 font-semibold transition-colors ${
                activeTab === 'description'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 font-semibold transition-colors ${
                activeTab === 'reviews'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reviews ({product.rating_count || 0})
            </button>
          </div>

          {activeTab === 'description' && product.description && (
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          )}

          {activeTab === 'reviews' && (
            <div className="text-center py-8 text-gray-600">
              <p>No reviews yet. Be the first to review this product!</p>
            </div>
          )}
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Products</h2>
            <ProductCarousel products={relatedProducts} />
          </section>
        )}
      </div>
    </main>
  );
}