// App Configuration
export const APP_NAME = 'JulineMart';
export const APP_DESCRIPTION = 'Your one-stop online marketplace';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Pagination
export const PRODUCTS_PER_PAGE = 20;
export const CATEGORIES_PER_PAGE = 20;
export const ORDERS_PER_PAGE = 10;

// Cart
export const MAX_CART_QUANTITY = 99;
export const MIN_ORDER_AMOUNT = 0;

// Currency
export const DEFAULT_CURRENCY = 'NGN';
export const CURRENCY_SYMBOL = '₦';

// Image Sizes
export const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 300, height: 300 },
  medium: { width: 600, height: 600 },
  large: { width: 1024, height: 1024 },
};

// Navigation Items
export const BOTTOM_NAV_ITEMS = [
  { name: 'Home', href: '/', icon: 'Home' },
  { name: 'Categories', href: '/categories', icon: 'LayoutGrid' },
  { name: 'Cart', href: '/cart', icon: 'ShoppingCart' },
  { name: 'Wishlist', href: '/wishlist', icon: 'Heart' },
  { name: 'Account', href: '/account', icon: 'User' },
];

// Product Tags for Homepage Sections
export const PRODUCT_TAGS = {
  FLASH_SALE: 'flash-sale',
  DEAL: 'deal',
  TRENDING: 'trending',
  NEW_ARRIVAL: 'new-arrival',
  FEATURED: 'featured',
  BEST_SELLER: 'best-seller',
  OFFICIAL_STORE: 'official-store',
};

// Order Status
export const ORDER_STATUS_LABELS = {
  pending: 'Pending Payment',
  processing: 'Processing',
  'on-hold': 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  failed: 'Failed',
};

export const ORDER_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  'on-hold': 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800',
  failed: 'bg-red-100 text-red-800',
};

// Storage Keys
export const STORAGE_KEYS = {
  CART: 'julinemart-cart',
  WISHLIST: 'julinemart-wishlist',
  USER: 'julinemart-user',
  RECENT_SEARCHES: 'julinemart-recent-searches',
  VIEWED_PRODUCTS: 'julinemart-viewed-products',
};

// API Endpoints (WCFM)
export const WCFM_ENDPOINTS = {
  VENDORS: '/wcfm/v1/vendors',
  VENDOR_PRODUCTS: '/wcfm/v1/vendors/:id/products',
};

// Social Links (Update with your actual links)
export const SOCIAL_LINKS = {
  facebook: 'https://facebook.com/julinemart',
  twitter: 'https://twitter.com/julinemart',
  instagram: 'https://instagram.com/julinemart',
  youtube: 'https://youtube.com/julinemart',
};

// Contact Information
export const CONTACT_INFO = {
  email: 'support@julinemart.com',
  phone: '+234 800 000 0000',
  address: 'Lagos, Nigeria',
};

// SEO Defaults
export const SEO_DEFAULTS = {
  title: 'JulineMart - Your Online Marketplace',
  description: 'Shop online for electronics, fashion, home appliances, and more at great prices.',
  keywords: 'online shopping, marketplace, buy online, Nigeria',
  ogImage: '/og-image.jpg',
};

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  NOT_FOUND: 'Item not found.',
  UNAUTHORIZED: 'You need to login to continue.',
  OUT_OF_STOCK: 'This item is out of stock.',
  INVALID_QUANTITY: 'Invalid quantity.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  ADDED_TO_CART: 'Added to cart successfully',
  REMOVED_FROM_CART: 'Removed from cart',
  ADDED_TO_WISHLIST: 'Added to wishlist',
  REMOVED_FROM_WISHLIST: 'Removed from wishlist',
  ORDER_PLACED: 'Order placed successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
};