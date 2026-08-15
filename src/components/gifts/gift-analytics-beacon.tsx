'use client';

import { useEffect, useRef } from 'react';
import { trackGiftBoxView, trackGiftLandingView } from '@/lib/analytics/gifts';

type LandingBeaconProps = {
  kind: 'landing';
  source: 'home_rail' | 'gifts_landing' | 'occasion_seo';
  occasion?: string;
  boxCount?: number;
};

type BoxBeaconProps = {
  kind: 'box';
  boxSlug: string;
  boxName: string;
  price: number;
};

type Props = LandingBeaconProps | BoxBeaconProps;

/** Fires gift analytics once on mount — safe inside server-rendered pages. */
export default function GiftAnalyticsBeacon(props: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    if (props.kind === 'landing') {
      trackGiftLandingView({
        source: props.source,
        occasion: props.occasion,
        boxCount: props.boxCount,
      });
      return;
    }

    trackGiftBoxView({
      boxSlug: props.boxSlug,
      boxName: props.boxName,
      price: props.price,
    });
  }, [props]);

  return null;
}
