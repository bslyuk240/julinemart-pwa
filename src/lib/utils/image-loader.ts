import type { ImageLoaderProps } from 'next/image';

export function imageLoader({ src }: ImageLoaderProps) {
  return src;
}
