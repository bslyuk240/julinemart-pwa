import Link from 'next/link';
import { Gift, Sparkles } from 'lucide-react';
import { fetchGiftBoxes } from '@/lib/jlo/gifts';
import { GIFT_OCCASIONS } from '@/lib/gifts/discovery';
import { formatPrice } from '@/lib/utils/format-price';
import GiftAnalyticsBeacon from '@/components/gifts/gift-analytics-beacon';

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

        <div className="mb-3 flex flex-wrap gap-2 md:gap-3">
          {GIFT_OCCASIONS.slice(0, 6).map((o) => (
            <Link
              key={o.slug}
              href={`/gifts/${o.slug}`}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-primary-50 hover:text-primary-800 md:text-sm"
            >
              {o.label}
            </Link>
          ))}
        </div>

        {/* Mobile: horizontal rail · Desktop: grid */}
        <div className="overflow-x-auto pb-1 md:overflow-visible md:pb-0">
          <div className="flex min-w-full snap-x snap-mandatory gap-3 md:gap-4 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:snap-none">
            <Link
              href="/gifts/build"
              className="flex w-[170px] flex-shrink-0 snap-start flex-col justify-end rounded-2xl bg-primary-600 p-4 text-white sm:w-[200px] md:w-auto md:min-h-[220px]"
            >
              <Sparkles className="mb-2 h-6 w-6 opacity-90" />
              <p className="text-sm font-bold">Build your own</p>
            </Link>
            {featured.map((box) => (
              <Link
                key={box.id}
                href={`/gifts/boxes/${box.slug}`}
                className="w-[170px] flex-shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 sm:w-[200px] md:w-auto"
              >
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
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-gray-900">{box.name}</p>
                  <p className="mt-1 text-sm font-bold text-primary-700">{formatPrice(box.list_price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
