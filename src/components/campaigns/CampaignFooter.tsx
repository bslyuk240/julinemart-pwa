import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '2347048929309'; // matches src/components/layout/whatsapp-float.tsx

export default function CampaignFooter() {
  return (
    <footer className="rounded-3xl bg-primary-900 p-6 text-primary-100 sm:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span>
          Powered by <strong className="text-white">JulineMart</strong>
        </span>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[48px] items-center gap-1.5 rounded-full bg-green-600 px-4 text-xs font-extrabold text-white"
        >
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp support
        </a>
      </div>
      <nav className="mb-3 flex flex-wrap gap-4 text-xs">
        <Link href="/page/shipping-policy" className="hover:text-white">
          Shipping policy
        </Link>
        <Link href="/page/terms-and-conditions" className="hover:text-white">
          Terms &amp; conditions
        </Link>
        <Link href="/page/privacy-policy" className="hover:text-white">
          Privacy policy
        </Link>
      </nav>
      <p className="text-[11px] text-primary-300">
        Offer valid on campaign-eligible products only, while stocks last. JulineMart Nigeria.
      </p>
    </footer>
  );
}
