'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildShareUrl, copyToClipboard, nativeShare } from '@/lib/share';

interface CampaignShareButtonProps {
  title: string;
  description?: string;
  slug: string;
  /** Compact icon-only for nav bars; full shows label on sm+ */
  variant?: 'icon' | 'button';
  className?: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://julinemart.com';

export default function CampaignShareButton({
  title,
  description,
  slug,
  variant = 'icon',
  className = '',
}: CampaignShareButtonProps) {
  const [open, setOpen] = useState(false);
  const shareUrl = `${SITE_URL}/campaigns/${slug}`;
  const shareText = description?.trim() || `Check out ${title} on JulineMart!`;

  const openWindow = (url: string) => {
    window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    const result = await nativeShare({ title, text: shareText, url: shareUrl });
    if (result === 'shared') toast.success('Shared!');
    else if (result === 'unavailable') {
      const copied = await copyToClipboard(shareUrl);
      toast[copied ? 'success' : 'error'](copied ? 'Link copied!' : 'Could not copy link');
    }
    setOpen(false);
  };

  const handleFacebook = () => {
    openWindow(buildShareUrl(shareUrl, 'facebook'));
    setOpen(false);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${shareText}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const handleTwitter = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400,noopener,noreferrer');
    setOpen(false);
  };

  const handleCopy = async () => {
    const copied = await copyToClipboard(shareUrl);
    toast[copied ? 'success' : 'error'](copied ? 'Link copied!' : 'Could not copy link');
    setOpen(false);
  };

  const triggerClass =
    variant === 'button'
      ? 'inline-flex min-h-[48px] items-center gap-1.5 rounded-full bg-primary-50 px-4 py-2 text-xs font-bold text-primary-700'
      : 'flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-primary-50 text-primary-700';

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        aria-label="Share campaign"
        aria-expanded={open}
      >
        <Share2 className="h-[17px] w-[17px]" />
        {variant === 'button' && <span className="hidden sm:inline">Share</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              <Share2 className="h-5 w-5 text-primary-600" />
              Share
            </button>
            <button
              type="button"
              onClick={handleFacebook}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
            >
              <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span className="font-medium text-gray-900">Facebook</span>
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
            >
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="font-medium text-gray-900">WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handleTwitter}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
            >
              <svg className="h-5 w-5 text-sky-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="font-medium text-gray-900">X / Twitter</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="font-medium text-gray-900">Copy link</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
