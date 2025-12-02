'use client';

import type { SVGProps } from 'react';
import Link from 'next/link';
import { Facebook, Instagram } from 'lucide-react';

function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M13.4 3.2v10.52a3.15 3.15 0 1 1-2.73-3.11V8.07a5.6 5.6 0 0 0-.85-.07 5.53 5.53 0 1 0 5.52 5.52V8.55a7.3 7.3 0 0 0 4.09 1.22V6.8a4.2 4.2 0 0 1-1.85-.4 4.16 4.16 0 0 1-2.21-3.2H13.4z" />
    </svg>
  );
}

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
          <div className="flex items-center gap-2 pt-1">
            <Link
              href="https://www.facebook.com/share/1GwmcMzTZH/?mibextid=wwXIfr"
              target="_blank"
              rel="noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Facebook className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Facebook</span>
            </Link>
            <Link
              href="https://www.instagram.com/julinemart_online?igsh=MWUxbXIwZHZzc2JhNg%3D%3D&utm_source=qr"
              target="_blank"
              rel="noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Instagram className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Instagram</span>
            </Link>
            <Link
              href="https://www.tiktok.com/@julinemart_official?_r=1&_t=ZN-91sz39P86VC"
              target="_blank"
              rel="noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <TikTokIcon className="h-4 w-4 fill-current" />
              <span className="sr-only">TikTok</span>
            </Link>
          </div>
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
        <div className="container mx-auto px-3 text-xs text-gray-200 flex flex-wrap items-center justify-center md:justify-between gap-x-4 gap-y-2">
          <span className="whitespace-nowrap">&copy; {new Date().getFullYear()} JulineMart.</span>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Link href="/page/privacy-policy" className="hover:text-primary-200">Privacy</Link>
            <span aria-hidden="true" className="text-gray-400">|</span>
            <Link href="/page/terms-of-service" className="hover:text-primary-200">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
