export type SharePlatform = 'facebook' | 'whatsapp' | 'twitter' | 'native' | 'clipboard';

export function buildShareUrl(pageUrl: string, platform: Exclude<SharePlatform, 'native' | 'clipboard'>): string {
  const encodedUrl = encodeURIComponent(pageUrl);

  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'whatsapp': {
      const text = encodeURIComponent(pageUrl);
      return `https://wa.me/?text=${text}`;
    }
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}`;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function nativeShare(params: {
  title: string;
  text?: string;
  url: string;
}): Promise<'shared' | 'cancelled' | 'unavailable'> {
  if (!navigator.share) return 'unavailable';
  try {
    await navigator.share(params);
    return 'shared';
  } catch {
    return 'cancelled';
  }
}
