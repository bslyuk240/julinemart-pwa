/**
 * Resolve campaign video URLs into something the landing page can render.
 * Direct file URLs (Cloudinary/Supabase MP4) use <video>; YouTube/Vimeo use iframe embeds.
 */

export type VideoPlayback =
  | { kind: 'file'; src: string }
  | { kind: 'youtube'; embedSrc: string }
  | { kind: 'vimeo'; embedSrc: string };

function youtubeEmbedSrc(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '');
  let id: string | null = null;

  if (host === 'youtu.be') {
    id = url.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname.startsWith('/embed/')) {
      id = url.pathname.split('/')[2] ?? null;
    } else if (url.pathname.startsWith('/shorts/')) {
      id = url.pathname.split('/')[2] ?? null;
    } else {
      id = url.searchParams.get('v');
    }
  }

  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
}

function vimeoEmbedSrc(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'player.vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean).pop();
    return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1` : null;
  }
  if (host === 'vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean).find((part) => /^\d+$/.test(part));
    return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1` : null;
  }
  return null;
}

export function resolveVideoPlayback(rawUrl: string): VideoPlayback | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    const youtube = youtubeEmbedSrc(url);
    if (youtube) return { kind: 'youtube', embedSrc: youtube };

    const vimeo = vimeoEmbedSrc(url);
    if (vimeo) return { kind: 'vimeo', embedSrc: vimeo };

    return { kind: 'file', src: trimmed };
  } catch {
    return null;
  }
}
