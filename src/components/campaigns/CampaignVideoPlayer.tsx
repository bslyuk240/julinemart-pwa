'use client';

import { resolveVideoPlayback } from '@/lib/campaigns/video-playback';

export default function CampaignVideoPlayer({
  url,
  className = 'h-full w-full',
  autoPlay = true,
}: {
  url: string;
  className?: string;
  autoPlay?: boolean;
}) {
  const playback = resolveVideoPlayback(url);
  if (!playback) {
    return (
      <p className="p-4 text-center text-sm text-white/80">
        This video link could not be played. Use a Cloudinary/Supabase MP4 URL, or a YouTube/Vimeo link.
      </p>
    );
  }

  if (playback.kind === 'youtube' || playback.kind === 'vimeo') {
    return (
      <iframe
        src={playback.embedSrc}
        title="Campaign video"
        className={className}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return (
    <video
      src={playback.src}
      controls
      playsInline
      autoPlay={autoPlay}
      className={className}
    />
  );
}
