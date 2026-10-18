import Link from 'next/link';
import { ArrowRight, Gem, Gift, Plus, Sparkles, SprayCan, Watch } from 'lucide-react';
import { fetchGiftBoxes } from '@/lib/jlo/gifts';
import { GIFT_OCCASIONS } from '@/lib/gifts/discovery';
import { formatPrice } from '@/lib/utils/format-price';
import GiftAnalyticsBeacon from '@/components/gifts/gift-analytics-beacon';

/** Entry card for /gifts/build: an open box with a few items in and one empty slot to fill. */
function BuildYourOwnCard() {
  const filled = [Gem, SprayCan, Watch];

  return (
    <Link
      href="/gifts/build"
      aria-label="Build your own gift box"
      className="group relative flex w-[170px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 via-primary-700 to-primary-900 p-3 text-white shadow-sm ring-1 ring-primary-800/40 transition-shadow hover:shadow-lg sm:w-[200px] md:w-[230px] md:p-4 lg:w-[260px]"
    >
      {/* soft glow + sparkles */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-secondary-400/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-primary-300/20 blur-2xl" />
      <Sparkles className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-secondary-300 md:h-5 md:w-5" />

      <span className="relative inline-flex w-fit items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white ring-1 ring-white/20 md:text-[11px]">
        DIY gift box
      </span>

      {/* open box illustration */}
      <div className="relative flex flex-1 items-center justify-center py-3 md:py-5">
        <div className="relative w-[78%] max-w-[170px]">
          <div className="absolute -top-3 left-1/2 h-3 w-[104%] -translate-x-1/2 -rotate-6 rounded-md bg-white/25 ring-1 ring-white/30 transition-transform duration-300 group-hover:-translate-y-1 group-hover:-rotate-12 md:-top-4 md:h-4" />
          <div className="grid aspect-square grid-cols-2 gap-1.5 rounded-xl bg-white/10 p-1.5 ring-1 ring-white/25 backdrop-blur-sm md:gap-2 md:p-2">
            {filled.map((Icon, i) => (
              <div key={i} className="flex items-center justify-center rounded-lg bg-white/15">
                <Icon className="h-5 w-5 text-white/90 md:h-6 md:w-6" />
              </div>
            ))}
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-secondary-300/80 bg-secondary-400/10 transition-colors group-hover:bg-secondary-400/25">
              <Plus className="h-5 w-5 text-secondary-200 motion-safe:animate-pulse md:h-6 md:w-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <p className="text-base font-bold leading-tight md:text-lg">Build your own box</p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/75 md:text-xs">
          You pick the items, we wrap &amp; deliver.
        </p>
        <span className="mt-2.5 flex w-full items-center justify-center gap-1 rounded bg-white px-2 py-1.5 text-xs font-semibold text-primary-700 transition-colors group-hover:bg-secondary-50 md:mt-3 md:py-2 md:text-sm">
          Start building
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 md:h-4 md:w-4" />
        </span>
      </div>
    </Link>
  );
}

export default async function GiftsHomeSection() {
  const { boxes } = await fetchGiftBoxes('warri');
  if (boxes.length === 0) return null;

  const featured = boxes.slice(0, 8);

  return (
    <section className="bg-rose-50 py-3 md:py-6">
      <GiftAnalyticsBeacon kind="landing" source="home_rail" boxCount={boxes.length} />
      <div className="container-custom min-w-0">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="rounded-lg bg-primary-600 p-1.5 md:p-2">
              <Gift className="h-4 w-4 text-white md:h-5 md:w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-primary-700 md:text-xs">
                JulineMart Gifts
              </p>
              <h2 className="text-base font-bold text-gray-900 md:text-xl">Gifts for Every Moment</h2>
            </div>
          </div>
          <Link
            href="/gifts"
            className="text-xs font-medium text-primary-700 hover:text-primary-900 md:text-sm"
          >
            Shop gifts
          </Link>
        </div>

        <div className="mb-3 overflow-x-auto pb-1 md:overflow-visible md:pb-0">
          <div className="flex gap-2 md:flex-wrap md:gap-3">
            {GIFT_OCCASIONS.slice(0, 6).map((o) => (
              <Link
                key={o.slug}
                href={`/gifts/${o.slug}`}
                className="flex-shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-primary-50 hover:text-primary-800 md:text-sm"
              >
                {o.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-full snap-x snap-mandatory gap-3 md:gap-4">
            <BuildYourOwnCard />
            {featured.map((box) => (
              <article
                key={box.id}
                className="flex w-[170px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 sm:w-[200px] md:w-[230px] lg:w-[260px]"
              >
                <Link href={`/gifts/boxes/${box.slug}`} className="block min-w-0">
                  <div className="aspect-square bg-rose-50">
                    {box.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={box.image_url} alt={box.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Gift className="h-10 w-10 text-primary-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 pb-2">
                    <p className="line-clamp-2 text-sm font-semibold text-gray-900">{box.name}</p>
                    <p className="mt-1 text-sm font-bold text-primary-700">{formatPrice(box.list_price)}</p>
                  </div>
                </Link>
                <div className="mt-auto px-3 pb-3">
                  <Link
                    href={`/gifts/checkout?box=${encodeURIComponent(box.slug)}`}
                    className="flex w-full items-center justify-center rounded bg-primary-600 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700 md:py-2 md:text-sm"
                  >
                    Send this gift
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
