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
  imageUrl?: string;
}): Promise<'shared' | 'cancelled' | 'unavailable'> {
  if (!navigator.share) return 'unavailable';

  const shareData: ShareData = {
    title: params.title,
    text: params.text,
    url: params.url,
  };

  if (params.imageUrl && typeof navigator.canShare === 'function') {
    try {
      const response = await fetch(params.imageUrl);
      if (response.ok) {
        const blob = await response.blob();
        const ext = blob.type.split('/')[1]?.split('+')[0] || 'jpg';
        const file = new File([blob], `share.${ext}`, {
          type: blob.type || 'image/jpeg',
        });
        const withFiles: ShareData = { ...shareData, files: [file] };
        if (navigator.canShare(withFiles)) {
          await navigator.share(withFiles);
          return 'shared';
        }
      }
    } catch {
      // Fall back to link-only share; OG tags still supply the preview image.
    }
  }

  try {
    await navigator.share(shareData);
    return 'shared';
  } catch {
    return 'cancelled';
  }
}
