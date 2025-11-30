'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#2a103b] text-gray-100 mt-10">
      <div className="container mx-auto px-4 py-8 md:py-10 grid gap-8 md:grid-cols-3">
        <div className="space-y-3">
          <h3 className="font-semibold text-white">Company</h3>
          <Link href="/page/about" className="block text-gray-200 hover:text-primary-200">
            About Us
          </Link>
          <Link href="/page/contact" className="block text-gray-200 hover:text-primary-200">
            Contact Us
          </Link>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-white">Policies</h3>
          <Link href="/page/privacy-policy" className="block text-gray-200 hover:text-primary-200">
            Privacy Policy
          </Link>
          <Link href="/page/refund_returns" className="block text-gray-200 hover:text-primary-200">
            Refund &amp; Returns Policy
          </Link>
          <Link href="/page/terms-of-service" className="block text-gray-200 hover:text-primary-200">
            Terms of Service
          </Link>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-white">Vendors</h3>
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
            Vendor Policy &amp; Guidelines
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10 py-4">
        <div className="container mx-auto px-4 text-sm text-gray-200 flex flex-col md:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} JulineMart. All rights reserved.</span>
          <div className="flex items-center gap-3 text-xs text-gray-300">
            <Link href="/page/privacy-policy" className="hover:text-primary-200">Privacy</Link>
            <span>•</span>
            <Link href="/page/terms-of-service" className="hover:text-primary-200">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
