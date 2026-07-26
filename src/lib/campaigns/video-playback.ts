/**
 * Resolve campaign video URLs into something the landing page can render.
 * Direct file URLs (Cloudinary/Supabase MP4) use <video>; YouTube/Vimeo use iframe embeds.
 */

export type VideoPlayback =
  | { kind: 'file'; src: string }
  | { kind: 'youtube'; embedSrc: string }
  | { kind: 'vimeo'; embedSrc: string };

function extractYoutubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    return url.pathname.split('/').filter(Boolean)[0] ?? null;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname.startsWith('/embed/')) {
      return url.pathname.split('/')[2] ?? null;
    }
    if (url.pathname.startsWith('/shorts/')) {
      return url.pathname.split('/')[2] ?? null;
    }
    return url.searchParams.get('v');
  }

  return null;
}

function youtubeEmbedSrc(url: URL): string | null {
  const id = extractYoutubeId(url);
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

// YouTube serves a thumbnail at a predictable, no-auth URL for any public
// video — free background image for the gallery's play button, no admin
// input required. Vimeo/direct-file URLs have no equivalent without an extra
// server-side fetch, so this only covers YouTube; callers fall back to
// item.thumbnailUrl (admin-provided) for everything else.
export function resolveYoutubeThumbnail(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const id = extractYoutubeId(url);
    return id ? `https://img.youtube.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
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
