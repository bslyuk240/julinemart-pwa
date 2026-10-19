'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Star, ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw, Minus, Plus, Store, BadgeCheck, ArrowLeft, Check, ChevronDown, Link2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/button';
import ProductGallery from '@/components/product/product-gallery';
import ProductCarousel from '@/components/product/product-carousel';
import { Badge } from '@/components/ui/badge';
import { getProductVariations, getProductReviews, createProductReview } from '@/lib/woocommerce/products';
import ProductFeatures from '@/components/product/product-features';
import JulineMartProtectBadge from '@/components/trust/JulineMartProtectBadge';
import ProductWarrantyBadge from '@/components/product/ProductWarrantyBadge';
import SellerTrustBadge from '@/components/trust/SellerTrustBadge';
import CollectionAvailabilityBanner from '@/components/local/CollectionAvailabilityBanner';
import ReserveCollectButton from '@/components/local/ReserveCollectButton';
import CustomiseProductPanel from '@/components/product/CustomiseProductPanel';
import { isCustomisableProduct } from '@/lib/custom-order';
import type { VendorTrustResponse } from '@/lib/trust/get-vendor-trust';
import { useCartStore } from '@/store/cart-store';
import { useWishlist } from '@/hooks/use-wishlist';
import { Product, ProductAttribute, ProductVariation, ProductReview } from '@/types/product';
import { toast } from 'sonner';
import { decodeHtmlEntities } from '@/lib/utils/helpers';
import { minVariationListPrice, parseMoney } from '@/lib/utils/parse-money';
import { mergeUniqueById, selectRelatedProducts } from '@/lib/utils/related-products';
import {
  trackProductViewed,
  trackAddToCart,
  trackAddToWishlist,
  trackShareProduct,
} from '@/lib/gtag';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { trackJourneyEvent } from '@/lib/analytics/track-event';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';
import MobileTopBar, { TopBarAction } from '@/components/mobile/shell/mobile-top-bar';
import StickyActionBar from '@/components/mobile/shell/sticky-action-bar';
import ActionSheet from '@/components/mobile/primitives/action-sheet';
import { useCart } from '@/hooks/use-cart';
import { haptic } from '@/lib/mobile/haptics';
import Spinner from '@/components/ui/spinner';

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

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '').trim();

const normalizeVariationKey = (value: string) =>
  (value ?? '')
    .toLowerCase()
    .trim()
    .replace(/^attribute[_-]/, '')
    .replace(/^pa[_-]/, '')
    .replace(/^product[_-]/, '')
    .replace(/[^a-z0-9]+/g, '');

const normalizeVariationValue = (value: string) =>
  (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const dedupeOptions = (options: string[]) =>
  Array.from(new Set(options.map((option) => option.trim()).filter(Boolean)));

const inferVariationAttributes = (variations: ProductVariation[]): ProductAttribute[] => {
  const map = new Map<
    string,
    {
      name: string;
      options: string[];
    }
  >();

  variations.forEach((variation) => {
    variation.attributes.forEach((attr) => {
      const rawName = (attr.name ?? '').trim();
      const rawOption = (attr.option ?? '').trim();
      if (!rawName || !rawOption) return;

      const key = normalizeVariationKey(rawName);
      if (!key) return;

      const existing = map.get(key);
      if (existing) {
        existing.options.push(rawOption);
        if (!existing.name && rawName) existing.name = rawName;
        return;
      }

      map.set(key, {
        name: rawName,
        options: [rawOption],
      });
    });
  });

  return Array.from(map.values()).map((attr, index) => ({
    id: index + 1,
    name: attr.name,
    position: index,
    visible: true,
    variation: true,
    options: dedupeOptions(attr.options),
  }));
};

// Clean up raw CJ option codes for display: "1544707-White-Size" → "White"
function cleanOptionLabel(option: string): string {
  // Strip leading numeric CJ product code prefix: e.g. "1544707-" or "4001234-"
  const withoutPrefix = option.replace(/^\d{4,}[\d-]*-/, '');
  // Strip trailing "-Size" or "-size" artifact from CJ attribute naming
  const withoutSuffix = withoutPrefix.replace(/-size$/i, '').trim();
  return withoutSuffix || option;
}

interface ProductDetailPageProps {
  initialProduct: Product;
}

export default function ProductDetailPage({ initialProduct }: ProductDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // UI Change Plan, "Changes to Existing Screens": campaign-referred visits
  // (from a "Choose Options" link on a variable product) get a context bar
  // back to the campaign. Absent for every normal visit — zero effect on the
  // other ~everyone who lands here without these params.
  const fromCampaignSlug = searchParams.get('from_campaign');
  const fromCampaignTitle = searchParams.get('from_campaign_title');
  const fromCampaignOffer = searchParams.get('from_campaign_offer');
  const product = initialProduct;
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    reviewer: '',
    reviewerEmail: '',
    rating: 0,
    review: '',
  });
  const [vendorTrust, setVendorTrust] = useState<VendorTrustResponse | null>(null);
  // Mobile tier (docs/mobile-tier-plan.md, M1): every mobile-only piece below
  // is gated on `tier` plus `md:hidden` / `max-md:` classes, so desktop is
  // untouched and removing /product/* from the allowlist reverts this page.
  const tier = useMobileTier() !== null;
  const [mobileShareOpen, setMobileShareOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const variationsRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const { itemCount: cartCount } = useCart();

  const { user, customer } = useCustomerAuth();

  // Prefill review form for authenticated users
  useEffect(() => {
    if (user) {
      const name = customer
        ? [customer.first_name, customer.last_name].filter(Boolean).join(' ')
        : (user.user_metadata?.full_name ?? user.user_metadata?.name ?? '');
      setReviewForm((prev) => ({
        ...prev,
        reviewer: prev.reviewer || name,
        reviewerEmail: prev.reviewerEmail || (user.email ?? ''),
      }));
    }
  }, [user, customer]);

  useEffect(() => {
    const vendorId = product?.store?.id;
    if (!vendorId) {
      setVendorTrust(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/vendor/${encodeURIComponent(String(vendorId))}/trust`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setVendorTrust(data?.trust ?? null);
      })
      .catch(() => {
        if (!cancelled) setVendorTrust(null);
      });
    return () => { cancelled = true; };
  }, [product?.store?.id]);

  const addToCart = useCartStore((state) => state.addItem);
  const { toggleWishlist, isInWishlist } = useWishlist();

  const fetchReviews = async () => {
    if (!product) return;
    try {
      setLoadingReviews(true);
      const productReviews = await getProductReviews(product.id, { supabaseId: product.supabaseId });
      setReviews(productReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  // fetch related after product is set to avoid blocking initial render
  useEffect(() => {
    const fetchRelated = async () => {
      if (!product) return;
      const limit = 6;
      try {
        const primary: Product[] = [];
        const ids = (product.related_ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0 && id !== product.id)
          .slice(0, limit);
        if (ids.length) {
          const r = await fetch(
            `/api/products?include=${ids.join(',')}&per_page=${String(Math.min(ids.length, 100))}`
          );
          if (r.ok) {
            const { products: fromIds } = await r.json();
            primary.push(
              ...(fromIds as Product[]).filter((p) => p && p.id > 0 && p.id !== product.id)
            );
          }
        }

        const res = await fetch('/api/products?per_page=100&orderby=date&order=desc&page=1');
        if (!res.ok) {
          if (primary.length) setRelatedProducts(primary.slice(0, limit));
          return;
        }
        const { products: pool } = await res.json();
        const candidates = (pool as Product[]).filter((p) => p && p.id !== product.id);
        const scored = selectRelatedProducts(product, candidates, limit);
        setRelatedProducts(mergeUniqueById(primary, scored, limit));
      } catch (error) {
        console.error('Error fetching related products:', error);
      }
    };
    fetchRelated();
  }, [product]);

  // fetch reviews when product changes
  useEffect(() => {
    fetchReviews();
  }, [product?.id]);

  // track product view on mount
  useEffect(() => {
    if (!product) return;
    trackProductViewed({
      itemId: String(product.id),
      itemName: product.name,
      price: parseMoney(product.price),
      itemBrand: (product as any).brands?.[0] ?? undefined,
      itemCategory: product.categories?.[0]?.name ?? undefined,
    });
    trackJourneyEvent({
      eventType: 'product_viewed',
      customerId: user?.id ?? null,
      customerEmail: user?.email ?? null,
      productId: product.supabaseId ?? null,
      sourcePage: window.location.pathname,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const formatPrice = (price: string | number) => {
    const numeric = typeof price === 'number' ? price : parseFloat(String(price ?? ''));
    const n = Number.isFinite(numeric) ? numeric : 0;
    return `₦${n.toLocaleString()}`;
  };

  const handleAddToCart = () => {
    if (!product) return;

    const requiresSelection = product.type === 'variable' && variationAttributes.length > 0;
    if (requiresSelection && !selectedVariation) {
      promptForOptions();
      return;
    }

    const variationPayload = selectedVariation
      ? {
          id: selectedVariation.id,
          supabaseId: selectedVariation.supabaseId,
          attributes: selectedVariation.attributes.reduce<Record<string, string>>(
            (acc, attr) => {
              acc[attr.name] = attr.option;
              return acc;
            },
            {}
          ),
          price: selectedPrice,
          regularPrice: selectedRegularPrice,
          salePrice: selectedVariation.sale_price
            ? parseFloat(selectedVariation.sale_price)
            : undefined,
          image: selectedVariation.image?.src,
          sku: selectedVariation.sku,
          stockQuantity: selectedVariation.stock_quantity ?? null,
          stockStatus: selectedVariation.stock_status,
        }
      : undefined;

    addToCart(product, quantity, variationPayload);
    if (isMobileTierViewport()) {
      // Stay on the page: confirm with a "View cart" action instead of a bare toast.
      haptic('success');
      const optionLabel = selectedVariation
        ? selectedVariation.attributes.map((attr) => cleanOptionLabel(attr.option)).join(', ')
        : '';
      toast.success(optionLabel ? `Added to cart · ${optionLabel}` : 'Added to cart', {
        action: { label: 'View cart', onClick: () => router.push('/cart') },
      });
    } else {
      toast.success('Added to cart');
    }
    trackAddToCart({
      value: selectedPrice * quantity,
      items: [{
        item_id: String(product.id),
        item_name: product.name,
        price: selectedPrice,
        quantity,
        item_brand: (product as any).brands?.[0] ?? undefined,
        item_category: product.categories?.[0]?.name ?? undefined,
      }],
    });
  };

  // True only on a mobile-tier route at phone width; decides behaviour, never layout.
  const isMobileTierViewport = () =>
    tier && typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

  const promptForOptions = () => {
    if (isMobileTierViewport()) {
      haptic('warning');
      variationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    toast.error('Please choose your options first');
  };

  const handleBuyNow = () => {
    if (!product) return;

    const requiresSelection = product.type === 'variable' && variationAttributes.length > 0;
    if (requiresSelection && !selectedVariation) {
      promptForOptions();
      return;
    }

    const variationPayload = selectedVariation
      ? {
          id: selectedVariation.id,
          supabaseId: selectedVariation.supabaseId,
          attributes: selectedVariation.attributes.reduce<Record<string, string>>(
            (acc, attr) => {
              acc[attr.name] = attr.option;
              return acc;
            },
            {}
          ),
          price: selectedPrice,
          regularPrice: selectedRegularPrice,
          salePrice: selectedVariation.sale_price
            ? parseFloat(selectedVariation.sale_price)
            : undefined,
          image: selectedVariation.image?.src,
          sku: selectedVariation.sku,
          stockQuantity: selectedVariation.stock_quantity ?? null,
          stockStatus: selectedVariation.stock_status,
        }
      : undefined;

    // Add to cart first
    addToCart(product, quantity, variationPayload);
    toast.success('Added to cart');

    // Redirect to checkout
    router.push('/checkout');
  };

  const handleWishlist = () => {
    if (!product) return;

    const wasAdded = toggleWishlist(product.id, {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: product.images?.[0]?.src || '/images/placeholder.svg',
    });

    if (isMobileTierViewport()) haptic(wasAdded ? 'success' : 'tap');
    if (wasAdded) {
      trackAddToWishlist({
        itemId: String(product.id),
        itemName: product.name,
        price: parseMoney(product.price),
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.name,
          text: product.short_description.replace(/<[^>]*>/g, ''),
          url: window.location.href,
        });
        trackShareProduct({ itemId: String(product.id), itemName: product.name, method: 'native' });
      } catch (error) {
        // User cancelled — don't track
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
      if (product) {
        trackShareProduct({ itemId: String(product.id), itemName: product.name, method: 'clipboard' });
      }
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!product) return;

    if (
      !reviewForm.reviewer.trim() ||
      !reviewForm.reviewerEmail.trim() ||
      !reviewForm.review.trim() ||
      reviewForm.rating < 1
    ) {
      toast.error('Please provide your name, email, rating, and review.');
      return;
    }

    setSubmittingReview(true);
    try {
      const newReview = await createProductReview({
        product_id: product.id,
        supabase_product_id: product.supabaseId,
        review: reviewForm.review.trim(),
        reviewer: reviewForm.reviewer.trim(),
        reviewer_email: reviewForm.reviewerEmail.trim(),
        rating: reviewForm.rating,
      });

      if (newReview) {
        setReviews((prev) => [newReview, ...prev]);
        toast.success('Review submitted!');
        setReviewForm((prev) => ({
          reviewer: prev.reviewer,
          reviewerEmail: prev.reviewerEmail,
          rating: 0,
          review: '',
        }));
      } else {
        toast.error('Unable to submit review right now.');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review.');
    } finally {
      setSubmittingReview(false);
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

  const selectedVariationKeyedAttrs = useMemo(() => {
    return Object.entries(selectedAttributes).reduce<Record<string, string>>((acc, [key, value]) => {
      const normalizedKey = normalizeVariationKey(key);
      if (normalizedKey && value) acc[normalizedKey] = value;
      return acc;
    }, {});
  }, [selectedAttributes]);

  const matchesVariationSelection = useMemo(
    () =>
      (
        variation: ProductVariation,
        overrides: Record<string, string> = {},
        strict = false
      ) => {
        if (!variation.attributes.length) return false;

        let matchedDimensions = 0;

        return variation.attributes.every((attr) => {
          const key = normalizeVariationKey(attr.name ?? '');
          if (!key) return true;

          const expected = Object.prototype.hasOwnProperty.call(overrides, key)
            ? overrides[key]
            : selectedVariationKeyedAttrs[key];

          if (!expected) {
            return strict ? false : true;
          }

          matchedDimensions += 1;
          return (
            normalizeVariationValue(expected) ===
            normalizeVariationValue(attr.option ?? '')
          );
        }) && (!strict || matchedDimensions > 0);
      },
    [selectedVariationKeyedAttrs]
  );

  const increaseQuantity = () => {
    if (product && effectiveStockQty && quantity < effectiveStockQty) {
      setQuantity(quantity + 1);
    } else if (!effectiveStockQty) {
      setQuantity(quantity + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // Load variations for variable products
  useEffect(() => {
    const hasUsableInlineVariations = (items: ProductVariation[] | undefined | null) => {
      if (!items?.length) return false;
      return items.every(
        (variation) =>
          Array.isArray(variation.attributes) &&
          variation.attributes.some(
            (attr) => Boolean((attr.name ?? '').trim()) && Boolean((attr.option ?? '').trim())
          )
      );
    };

    const loadVariations = async () => {
      if (!product || product.type !== 'variable') {
        setVariations([]);
        setSelectedAttributes({});
        setSelectedVariation(null);
        return;
      }

      try {
        setLoadingVariations(true);
        // Supabase products may expose either full inline variation objects or
        // just variation IDs. For CJ imports, inline records may be present but
        // have incomplete/misaligned attributes which can bind the wrong image
        // to an option. Only trust inline data when attributes are usable.
        const inlineVariations = hasUsableInlineVariations(product._variations)
          ? product._variations
          : null;
        const data = inlineVariations ?? await getProductVariations(product.id);
        setVariations(data);

        // Prefill defaults if available
        if (product.default_attributes?.length) {
          const defaults: Record<string, string> = {};
          product.default_attributes.forEach((attr: any) => {
            const k = normalizeVariationKey(String(attr.name ?? ''));
            const v = (attr.option ?? '').trim();
            if (k && v) defaults[k] = v;
          });
          setSelectedAttributes(defaults);
        } else {
          setSelectedAttributes({});
        }
      } catch (err) {
        console.error('Error loading variations', err);
      } finally {
        setLoadingVariations(false);
      }
    };

    loadVariations();
  }, [product]);

  // Find matching variation when selections change
  useEffect(() => {
    if (!variations.length) {
      setSelectedVariation(null);
      return;
    }

    const match = variations.find((variation) => matchesVariationSelection(variation, {}, true));
    setSelectedVariation(match || null);
  }, [matchesVariationSelection, variations]);

  const variationAttributes = useMemo(
    () => {
      const inferredAttrs = inferVariationAttributes(variations);
      if (inferredAttrs.length > 0) return inferredAttrs;

      const attrs = product?.attributes?.filter((attr) => attr.variation) || [];
      return attrs;
    },
    [product, variations]
  );

  const selectedPrice = useMemo(() => {
    if (!product) return 0;
    if (selectedVariation) {
      const sale = selectedVariation.sale_price
        ? parseFloat(String(selectedVariation.sale_price))
        : NaN;
      if (Number.isFinite(sale) && sale > 0) return sale;
      const fromVariation = parseMoney(selectedVariation.price, selectedVariation.regular_price);
      if (fromVariation > 0) return fromVariation;
      return parseMoney(product.sale_price, product.price, product.min_price);
    }
    return parseMoney(
      product.sale_price,
      product.price,
      product.min_price,
      variations.length ? minVariationListPrice(variations) : undefined
    );
  }, [product, selectedVariation, variations]);

  const selectedRegularPrice = useMemo(() => {
    if (!product) return 0;
    if (selectedVariation?.regular_price) {
      const reg = parseFloat(String(selectedVariation.regular_price));
      if (Number.isFinite(reg) && reg > 0) return reg;
    }
    const fromParent = parseMoney(product.regular_price, product.price, product.min_price);
    if (fromParent > 0) return fromParent;
    return selectedPrice;
  }, [product, selectedPrice, selectedVariation]);

  const reviewCount = reviews.length || product?.rating_count || 0;

  const averageRating = useMemo(() => {
    if (reviews.length) {
      const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
      return Number((total / reviews.length).toFixed(1));
    }
    return product?.average_rating ? parseFloat(product.average_rating) : 0;
  }, [reviews, product?.average_rating]);

  const ratingCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((review) => {
      const stars = Math.round(Number(review.rating) || 0);
      if (stars >= 1 && stars <= 5) counts[stars - 1] += 1;
    });
    return counts;
  }, [reviews]);

  const openReviews = () => {
    setActiveTab('reviews');
    requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const effectiveStockStatus =
    selectedVariation?.stock_status || product?.stock_status || 'outofstock';
  const effectiveStockQty =
    selectedVariation?.stock_quantity ?? product?.stock_quantity ?? null;

  const galleryImages = selectedVariation?.image?.src && product
    ? [
        {
          id: selectedVariation.image.id || selectedVariation.id,
          date_created: '',
          date_modified: '',
          src: selectedVariation.image.src,
          name: selectedVariation.image.name || product.name,
          alt: selectedVariation.image.alt || product.name,
        },
        ...product.images,
      ]
    : product?.images || [];

  const discountPercentage =
    selectedRegularPrice && selectedRegularPrice > selectedPrice
      ? Math.round(((selectedRegularPrice - selectedPrice) / selectedRegularPrice) * 100)
      : 0;

  const inWishlist = isInWishlist(product.id);
  const reviewsAllowed = product.reviews_allowed;
  const decodedProductName = decodeHtmlEntities(product.name);
  const hasOfficialTag = product.tags?.some((tag) => tag.slug === 'official-store');
  const hasShipsFromAbroadTag = product.tags?.some((tag) => {
    const normalizedSlug = tag.slug?.trim().toLowerCase();
    const normalizedName = tag.name?.trim().toLowerCase();

    return normalizedSlug === 'ships-from-abroad' || normalizedName === 'ships from abroad';
  });
  const productBadges = product.tags?.filter((tag) =>
    ['flash-sale', 'deal', 'featured', 'new-arrival', 'black-friday'].includes(tag.slug)
  ) || [];
  const primaryCategoryName = product.categories?.[0]?.name
    ? decodeHtmlEntities(product.categories[0].name)
    : '';
  const primaryBrandName = product.brands?.[0]?.name
    ? decodeHtmlEntities(product.brands[0].name)
    : '';
  const storeName = product.store
    ? product.store.shop_name ||
      product.store.name ||
      (product.store.url
        ? product.store.url.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
        : 'Vendor Store')
    : '';
  const backHref = product.categories?.[0]?.slug ? `/category/${product.categories[0].slug}` : '/';

  const displaySku =
    (selectedVariation?.sku && String(selectedVariation.sku).trim()) ||
    (product.sku && String(product.sku).trim()) ||
    '';

  return (
    <main className={clsx('min-h-screen bg-white pb-24 md:pb-8 overflow-x-hidden', tier && 'max-md:overflow-x-clip max-md:pb-0')}>
      {tier && (
        <MobileTopBar
          variant={fromCampaignSlug ? 'small' : 'overlay'}
          title={decodedProductName}
          backHref={backHref}
          actions={
            <>
              <TopBarAction label="Share" onImage={!fromCampaignSlug} onClick={() => setMobileShareOpen(true)}>
                <Share2 className="h-5 w-5" aria-hidden />
              </TopBarAction>
              <TopBarAction label="Cart" href="/cart" badge={cartCount} onImage={!fromCampaignSlug}>
                <ShoppingCart className="h-5 w-5" aria-hidden />
              </TopBarAction>
            </>
          }
        />
      )}
      {fromCampaignSlug && (
        <Link
          href={`/campaigns/${fromCampaignSlug}`}
          className="flex items-center gap-2 bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary-700"
        >
          <ArrowLeft className="h-4 w-4 flex-none" />
          <span className="truncate">
            Return to {fromCampaignTitle || 'the campaign'}
            {fromCampaignOffer ? ` to secure: ${fromCampaignOffer}` : ''}
          </span>
        </Link>
      )}
      <div className={clsx('container-custom py-4 md:py-6 overflow-x-hidden', tier && 'max-md:pt-0')}>
        {/* Breadcrumb */}
        <nav className={clsx('text-sm text-gray-600 mb-4', tier && 'max-md:hidden')}>
          <a href="/" className="hover:text-primary-600">Home</a>
          <span className="mx-2">/</span>
          {product.categories && product.categories.length > 0 && (
            <>
              <a href={`/category/${product.categories[0].slug}`} className="hover:text-primary-600">
                {decodeHtmlEntities(product.categories[0].name)}
              </a>
              <span className="mx-2">/</span>
            </>
          )}
          <span className="text-gray-900">{decodedProductName}</span>
        </nav>

        {/* ==================== PRODUCT BADGES (LIKE JUMIA) ==================== */}
        {(hasOfficialTag || hasShipsFromAbroadTag || productBadges.length > 0) && (
          <div className={clsx('mb-4 flex flex-wrap gap-2', tier && 'max-md:hidden')}>
            {/* Official Store Badge */}
            {hasOfficialTag && (
              <div className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs md:text-sm font-semibold px-3 py-1.5 rounded-md shadow-sm">
                <BadgeCheck className="w-4 h-4" />
                Official Store
              </div>
            )}

            {hasShipsFromAbroadTag && (
              <div className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-800 md:text-xs">
                Ships from Abroad
              </div>
            )}
            
            {/* Product Tag Badges */}
            {productBadges.map((tag) => {
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

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-10 max-w-full">
          {/* Product Gallery */}
          <div className={clsx('min-w-0', tier && 'max-md:-mx-4')}>
            <ProductGallery images={galleryImages} productName={decodedProductName} edgeToEdge={tier} />
          </div>

          {/* Product Info */}
          <div className="space-y-5 min-w-0">
            <div>
              {tier && (hasOfficialTag || hasShipsFromAbroadTag || productBadges.length > 0) && (
                <div className="mb-3 flex flex-wrap gap-2 md:hidden">
                  {hasOfficialTag && (
                    <span className="inline-flex h-6 items-center gap-1 rounded-md bg-blue-600 px-2 text-m-label-s text-white">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                      Official Store
                    </span>
                  )}
                  {hasShipsFromAbroadTag && (
                    <span className="inline-flex h-6 items-center rounded-md bg-m-surface-high px-2 text-m-label-s text-m-on-surface-variant">
                      Ships from abroad
                    </span>
                  )}
                  {productBadges.map((tag) => {
                    const config = getBadgeConfig(tag.slug);
                    return (
                      <span key={tag.id} className={`${config.bgColor} inline-flex h-6 items-center rounded-md px-2 text-m-label-s text-white`}>
                        {config.label}
                      </span>
                    );
                  })}
                </div>
              )}
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

              <h1
                className={clsx(
                  'text-base md:text-xl font-bold text-gray-900 mb-2 leading-tight line-clamp-2',
                  tier && 'max-md:text-[22px] max-md:font-medium max-md:leading-7 max-md:tracking-[-0.01em] max-md:line-clamp-3 max-md:text-m-on-surface',
                )}
              >
                {decodedProductName}
              </h1>
              
              {/* Rating */}
              {averageRating > 0 && (
                <div className="flex items-center gap-2 md:gap-3 mb-3">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 md:w-5 md:h-5 ${
                          i < Math.floor(averageRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {averageRating.toFixed(1)} ({reviewCount} reviews)
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={clsx(
                    'text-lg md:text-xl font-bold text-primary-600',
                    tier && 'max-md:text-[28px] max-md:leading-9 max-md:tracking-[-0.02em] max-md:text-m-on-surface max-md:tabular-nums',
                  )}
                >
                  {formatPrice(selectedPrice.toString())}
                </span>
                {discountPercentage > 0 && (
                  <>
                    <span className="text-base md:text-lg text-gray-400 line-through">
                      {formatPrice(selectedRegularPrice.toString())}
                    </span>
                    <Badge variant="danger">
                      -{discountPercentage}% OFF
                    </Badge>
                  </>
                )}
              </div>

              {/* Stock Status */}
              {effectiveStockStatus === 'instock' ? (
                <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-5">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-green-600 font-medium text-sm md:text-base">In Stock</p>
                  {effectiveStockQty !== null && (
                    <span className="text-gray-500 text-xs md:text-sm">({effectiveStockQty} available)</span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-5">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <p className="text-red-600 font-medium text-sm md:text-base">Out of Stock</p>
                </div>
              )}
            </div>

            {/* Variations */}
            {product.type === 'variable' && variationAttributes.length > 0 && (
              <div ref={variationsRef} className="border-t pt-4 md:pt-5 space-y-4 scroll-mt-24">
                {variationAttributes.map((attr) => {
                  const key = normalizeVariationKey(attr.name ?? '');
                  const selected = key ? selectedAttributes[key] : undefined;

                  const isOptionAvailable = (option: string) => {
                    if (!variations.length) return true;
                    return variations.some((variation) =>
                      matchesVariationSelection(variation, key ? { [key]: option } : {}, false)
                    );
                  };

                  return (
                    <div key={attr.id || attr.name || key} className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">
                          {attr.name}
                        </p>
                        {selected && (
                          <span className="text-xs text-gray-500">
                            Selected: {cleanOptionLabel(selected)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {attr.options.map((option, index) => {
                          const optionTrimmed = (option ?? '').trim();
                          const isSelected = selected === optionTrimmed;
                          const disabled = !isOptionAvailable(optionTrimmed);
                          return (
                            <button
                              key={`${key || 'variation'}-${optionTrimmed || index}`}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                if (!key) return;
                                if (isMobileTierViewport()) haptic('selection');
                                setSelectedAttributes((prev) => ({
                                  ...prev,
                                  [key]: optionTrimmed,
                                }));
                              }}
                              className={clsx(
                                `px-3 py-2 rounded-lg border text-sm transition-colors ${
                                  isSelected
                                    ? 'border-primary-600 bg-primary-50 text-primary-700 font-semibold'
                                    : 'border-gray-300 text-gray-700 hover:border-primary-500'
                                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
                                // Material filter chip: 40px tall, selected = tonal fill + check.
                                tier && 'max-md:inline-flex max-md:h-10 max-md:items-center max-md:gap-1.5 max-md:px-4 max-md:font-semibold',
                                tier && isSelected && 'max-md:border-transparent max-md:bg-m-primary-container max-md:text-m-on-primary-container',
                                tier && !isSelected && 'max-md:border-m-outline-variant max-md:text-m-on-surface-variant',
                              )}
                            >
                              {tier && isSelected && <Check className="h-[18px] w-[18px] md:hidden" aria-hidden />}
                              {cleanOptionLabel(optionTrimmed)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {loadingVariations && (
                  <p className="text-sm text-gray-500">Loading variations...</p>
                )}

                {variationAttributes.length > 0 &&
                  variationAttributes.every((attr) => selectedAttributes[normalizeVariationKey(attr.name ?? '')]) &&
                  !selectedVariation && !loadingVariations && (
                    <p className="text-sm text-red-600">
                      This combination is not available. Please choose a different option.
                    </p>
                  )}
              </div>
            )}

            {/* SKU & BRAND - ADD THIS SECTION */}
<div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-200">
  {/* SKU: parent and/or selected variation (variable products often only have variation SKUs) */}
  {displaySku && (
    <div className="flex items-center gap-2">
      <span className="font-medium text-gray-900">SKU:</span>
      <span className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">
        {displaySku}
      </span>
    </div>
  )}
  
  {/* Brand */}
  {product.brands && product.brands.length > 0 && (
    <div className="flex items-center gap-2">
      <span className="font-medium text-gray-900">Brand:</span>
      <Link 
        href={`/brand/${product.brands[0].slug}`}
        className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
      >
        {primaryBrandName}
      </Link>
    </div>
  )}
  
  {/* Category */}
  {product.categories && product.categories.length > 0 && (
    <div className="flex items-center gap-2">
      <span className="font-medium text-gray-900">Category:</span>
      <Link 
        href={`/category/${product.categories[0].slug}`}
        className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
      >
        {primaryCategoryName}
      </Link>
    </div>
  )}
</div>

            {/* Short Description */}
            {product.short_description && (
              <div 
                className="prose prose-sm text-gray-700 border-t pt-5 line-clamp-4 overflow-hidden break-words max-w-full [overflow-wrap:anywhere] [&_table]:w-full [&_table]:max-w-full [&_table]:block [&_table]:overflow-x-auto [&_table]:whitespace-nowrap [&_img]:max-w-full [&_img]:h-auto"
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
              <JulineMartProtectBadge className={clsx('mb-1', tier && 'max-md:hidden')} />
              <ProductWarrantyBadge
                warrantyType={product.warranty_type}
                warrantyMonths={product.warranty_months}
              />

              {isCustomisableProduct(product.customisationSchema) && (
                <CustomiseProductPanel
                  product={product}
                  schema={product.customisationSchema}
                  selectedVariation={selectedVariation}
                  basePrice={selectedPrice}
                  requiresSelection={
                    product.type === 'variable' && variationAttributes.length > 0
                  }
                />
              )}

              <div className={clsx('flex gap-3 md:gap-4 flex-wrap md:flex-nowrap', tier && 'max-md:hidden')}>
                <Button
                  onClick={handleAddToCart}
                  variant="primary"
                  size="sm"
                  fullWidth
                  disabled={
                    effectiveStockStatus === 'outofstock' ||
                    (product.type === 'variable' &&
                      variationAttributes.length > 0 &&
                      !selectedVariation)
                  }
                  className="flex-1 text-sm md:text-base"
                >
                  <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Add to Cart
                </Button>
                
                <Button 
                  onClick={handleWishlist}
                  variant={inWishlist ? "primary" : "outline"}
                  size="sm"
                >
                  <Heart className={`w-4 h-4 md:w-5 md:h-5 ${inWishlist ? 'fill-current' : ''}`} />
                </Button>
                
                {/* Share Dropdown */}
                <div className="relative">
                  <Button 
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    variant="outline" 
                    size="sm"
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
                size="sm" 
                fullWidth
                disabled={
                  effectiveStockStatus === 'outofstock' ||
                  (product.type === 'variable' &&
                    variationAttributes.length > 0 &&
                    !selectedVariation)
                }
                className={clsx('text-sm md:text-base', tier && 'max-md:hidden')}
              >
                Buy Now
              </Button>

              {vendorTrust?.physical_store?.supports_pickup && (
                <ReserveCollectButton
                  fullWidth
                  disabled={
                    effectiveStockStatus === 'outofstock' ||
                    (product.type === 'variable' &&
                      variationAttributes.length > 0 &&
                      !selectedVariation)
                  }
                />
              )}
            </div>

            {vendorTrust?.physical_store?.supports_pickup && (
              <CollectionAvailabilityBanner trust={vendorTrust} className="mt-4" />
            )}

            {/* Features */}
            <ProductFeatures className={clsx('border-t pt-6', tier && 'max-md:hidden')} />
            {tier && <ProductFeatures variant="list" className="-mx-4 border-t border-m-outline-variant py-1 md:hidden" />}

            {/* Vendor Info Card */}
            {product.store && (
              <div className={clsx('border-t pt-6', tier && 'max-md:hidden')}>
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
                      {vendorTrust && (
                        <SellerTrustBadge
                          level={vendorTrust.level}
                          verifications={vendorTrust.verifications}
                          compact
                          className="mb-2"
                        />
                      )}
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
        <div ref={tabsRef} className={clsx('border-t pt-8 mb-12', tier && 'max-md:mb-0 max-md:scroll-mt-20')}>
          <div className="flex gap-4 md:gap-8 border-b mb-6 overflow-x-auto pb-1 md:overflow-visible">
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
              Reviews ({reviewCount})
            </button>
          </div>

          {activeTab === 'description' && product.description && (
            <>
              <div
                className={clsx(
                  'prose max-w-none break-words [overflow-wrap:anywhere] [&>table]:w-full [&>table]:max-w-full [&>table]:block [&>table]:overflow-x-auto [&>table]:whitespace-nowrap [&_img]:max-w-full [&_img]:h-auto',
                  tier && !descriptionExpanded && 'max-md:max-h-72 max-md:overflow-hidden max-md:[mask-image:linear-gradient(to_bottom,black_70%,transparent)]',
                )}
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
              {tier && (
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded((open) => !open)}
                  aria-expanded={descriptionExpanded}
                  className="-ml-3 mt-1 inline-flex h-10 items-center gap-1 rounded-full px-3 text-m-label-l text-m-primary md:hidden"
                >
                  {descriptionExpanded ? 'Show less' : 'Read more'}
                  <ChevronDown className={clsx('h-[18px] w-[18px] transition-transform', descriptionExpanded && 'rotate-180')} aria-hidden />
                </button>
              )}
            </>
          )}

          {activeTab === 'reviews' && (
            <div className="grid md:grid-cols-5 gap-8">
              <div className="md:col-span-3 space-y-4">
                {loadingReviews ? (
                  <div className="flex items-center justify-center py-12 text-gray-600">
                    <Spinner size="md" className="mr-3" />
                    Loading reviews...
                  </div>
                ) : reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{review.reviewer}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(review.date_created).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {stripHtml(review.review)}
                      </p>
                      {review.status && review.status !== 'approved' && (
                        <p className="text-xs text-amber-600 mt-2 font-medium">Pending approval</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-600 border border-dashed border-gray-200 rounded-lg">
                    <p className="font-medium">No reviews yet.</p>
                    <p className="text-sm text-gray-500">Be the first to share your thoughts.</p>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Write a review</h3>
                  <p className="text-sm text-gray-600 mb-4">Share your experience and rate this product.</p>

                  {!reviewsAllowed ? (
                    <p className="text-sm text-gray-500">Reviews are disabled for this product.</p>
                  ) : (
                    <form className="space-y-3" onSubmit={handleReviewSubmit}>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Your rating</label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              onClick={() => setReviewForm((prev) => ({ ...prev, rating }))}
                              className="p-1"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  reviewForm.rating >= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                          <input
                            type="text"
                            value={reviewForm.reviewer}
                            onChange={(e) => setReviewForm((prev) => ({ ...prev, reviewer: e.target.value }))}
                            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 ${user ? 'border-gray-200 bg-gray-50 text-gray-700' : 'border-gray-300'}`}
                            placeholder="Your name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={reviewForm.reviewerEmail}
                            onChange={(e) => setReviewForm((prev) => ({ ...prev, reviewerEmail: e.target.value }))}
                            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 ${user ? 'border-gray-200 bg-gray-50 text-gray-700' : 'border-gray-300'}`}
                            placeholder="you@example.com"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Review</label>
                        <textarea
                          value={reviewForm.review}
                          onChange={(e) => setReviewForm((prev) => ({ ...prev, review: e.target.value }))}
                          rows={4}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
                          placeholder="Tell others about your experience"
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        fullWidth
                        disabled={submittingReview}
                      >
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {tier && (
          <div className="-mx-4 mt-6 md:hidden">
            <div className="h-2 bg-m-surface-low" />
            <section aria-labelledby="mobile-reviews-heading" className="p-4">
              <div className="flex items-center justify-between">
                <h2 id="mobile-reviews-heading" className="text-m-title-m text-m-on-surface">Reviews</h2>
                <button type="button" onClick={openReviews} className="-mr-3 h-10 rounded-full px-3 text-m-label-l text-m-primary">
                  {reviewCount > 0 ? 'See all' : 'Write a review'}
                </button>
              </div>
              {reviewCount > 0 ? (
                <div className="mt-1 flex items-center gap-4">
                  <div className="shrink-0">
                    <p className="text-[36px] font-bold leading-[44px] tabular-nums text-m-on-surface">{averageRating.toFixed(1)}</p>
                    <p className="text-m-body-s text-m-on-surface-variant">
                      {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                  <div className="grid flex-1 gap-1" aria-label="Rating breakdown">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = ratingCounts[stars - 1];
                      const total = reviews.length || 1;
                      return (
                        <div key={stars} className="flex items-center gap-2 text-m-body-s text-m-on-surface-variant">
                          <span className="w-2 tabular-nums">{stars}</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-m-surface-high">
                            <span
                              className="block h-full rounded-full bg-m-primary"
                              style={{ width: `${Math.round((count / total) * 100)}%` }}
                            />
                          </span>
                          <span className="sr-only">{count} with {stars} stars</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-m-body-m text-m-on-surface-variant">No reviews yet. Be the first to share your thoughts.</p>
              )}
            </section>

            {product.store && (
              <>
                <div className="h-2 bg-m-surface-low" />
                <div className="flex min-h-[72px] items-center gap-4 px-4 py-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-m-primary-container text-m-primary">
                    <Store className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-m-body-m text-m-on-surface-variant">Sold by</p>
                    <p className="truncate text-[15px] font-semibold leading-5 text-m-on-surface">{storeName}</p>
                    {vendorTrust && (
                      <SellerTrustBadge
                        level={vendorTrust.level}
                        verifications={vendorTrust.verifications}
                        compact
                        className="mt-1"
                      />
                    )}
                  </div>
                  <Link
                    href={`/vendor/${product.store.id}`}
                    className="inline-flex h-10 shrink-0 items-center rounded-full px-4 text-m-label-l text-m-primary shadow-[inset_0_0_0_1px_var(--m-outline)] active:bg-m-primary-container"
                  >
                    Visit store
                  </Link>
                </div>
              </>
            )}
            <div className="h-2 bg-m-surface-low" />
          </div>
        )}

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="border-t pt-8">
            <h2 className="text-sm md:text-base font-bold text-gray-900 mb-4 md:mb-6">Related Products</h2>
            <ProductCarousel products={relatedProducts} />
          </section>
        )}
      </div>

      {tier && (
        <StickyActionBar>
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
            aria-pressed={inWishlist}
            className={clsx(
              'grid h-12 w-12 shrink-0 place-items-center rounded-full shadow-[inset_0_0_0_1px_var(--m-outline)]',
              inWishlist ? 'text-m-primary' : 'text-m-on-surface-variant',
            )}
          >
            <Heart className={clsx('h-5 w-5', inWishlist && 'fill-current')} aria-hidden />
          </button>
          {effectiveStockStatus === 'outofstock' ? (
            <button
              type="button"
              disabled
              className="h-12 flex-1 rounded-full bg-m-surface-high text-m-label-l text-m-on-surface-variant"
            >
              Out of stock
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleAddToCart}
                className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-m-primary px-4 text-m-label-l text-m-on-primary shadow-[0_1px_2px_rgb(60_4_69/0.3)] active:opacity-90"
              >
                <ShoppingCart className="h-[18px] w-[18px] shrink-0" aria-hidden />
                <span className="truncate">Add to cart</span>
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                className="inline-flex h-12 min-w-0 flex-1 items-center justify-center rounded-full bg-m-tertiary px-4 text-m-label-l text-m-on-tertiary active:opacity-90"
              >
                Buy now
              </button>
            </>
          )}
        </StickyActionBar>
      )}

      {tier && (
        <ActionSheet
          open={mobileShareOpen}
          onClose={() => setMobileShareOpen(false)}
          title="Share"
          actions={[
            ...(typeof navigator !== 'undefined' && 'share' in navigator
              ? [{ label: 'Share via…', icon: <Share2 className="h-5 w-5" aria-hidden />, onSelect: handleShare }]
              : []),
            { label: 'WhatsApp', icon: <Share2 className="h-5 w-5" aria-hidden />, onSelect: handleWhatsAppShare },
            { label: 'Facebook', icon: <Share2 className="h-5 w-5" aria-hidden />, onSelect: handleFacebookShare },
            { label: 'Copy link', icon: <Link2 className="h-5 w-5" aria-hidden />, onSelect: handleCopyLink },
          ]}
        />
      )}
    </main>
  );
}
