'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#2a103b] text-gray-100 mt-10 text-sm pb-16 md:pb-6">
      <div className="container mx-auto px-3 py-4 md:py-6 grid grid-cols-3 gap-4 md:gap-6">
        <div className="space-y-1.5">
          <h3 className="font-semibold text-white text-sm">Company</h3>
          <Link href="/page/about" className="block text-gray-200 hover:text-primary-200">
            About Us
          </Link>
          <Link href="/page/contact" className="block text-gray-200 hover:text-primary-200">
            Contact Us
          </Link>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold text-white text-sm">Policies</h3>
          <Link href="/page/privacy-policy" className="block text-gray-200 hover:text-primary-200">
            Privacy Policy
          </Link>
          <Link href="/page/refund_returns" className="block text-gray-200 hover:text-primary-200">
            Refund &amp; Returns
          </Link>
          <Link href="/page/terms-of-service" className="block text-gray-200 hover:text-primary-200">
            Terms of Service
          </Link>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold text-white text-sm">Vendors</h3>
          <Link href="/page/become-a-vendor" className="block text-gray-200 hover:text-primary-200">
            Become a Vendor
          </Link>
          <Link href="/page/vendor-benefits" className="block text-gray-200 hover:text-primary-200">
            Vendor Benefits
          </Link>
          <Link href="/page/vendor-membership" className="block text-gray-200 hover:text-primary-200">
            Vendor Membership
          </Link>
          <Link href="/page/vendor-policy-guidelines" className="block text-gray-200 hover:text-primary-200">
            Vendor Guidelines
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10 py-3">
        <div className="container mx-auto px-3 text-xs text-gray-200 flex flex-col md:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} JulineMart.</span>
          <div className="flex items-center gap-2">
            <Link href="/page/privacy-policy" className="hover:text-primary-200">Privacy</Link>
            <span>•</span>
            <Link href="/page/terms-of-service" className="hover:text-primary-200">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
