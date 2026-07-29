import { describe, expect, it } from 'vitest';
import { resolveVideoPlayback } from './video-playback';

describe('resolveVideoPlayback', () => {
  it('treats Cloudinary delivery URLs as file sources', () => {
    const url =
      'https://res.cloudinary.com/dupgdbwrt/video/upload/v1763955248/sample.mp4';
    expect(resolveVideoPlayback(url)).toEqual({ kind: 'file', src: url });
  });

  it('embeds YouTube watch URLs', () => {
    expect(resolveVideoPlayback('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      kind: 'youtube',
      embedSrc: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0',
    });
  });

  it('embeds youtu.be short links', () => {
    expect(resolveVideoPlayback('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      kind: 'youtube',
      embedSrc: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0',
    });
  });

  it('embeds Vimeo URLs', () => {
    expect(resolveVideoPlayback('https://vimeo.com/123456789')).toEqual({
      kind: 'vimeo',
      embedSrc: 'https://player.vimeo.com/video/123456789?autoplay=1',
    });
  });

  it('returns null for empty input', () => {
    expect(resolveVideoPlayback('')).toBeNull();
  });
});
