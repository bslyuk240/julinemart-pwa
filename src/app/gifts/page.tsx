import type { Metadata } from 'next';
import Link from 'next/link';
import { Gift } from 'lucide-react';
import { fetchGiftBoxes } from '@/lib/jlo/gifts';
import { formatPrice } from '@/lib/utils/format-price';

export const metadata: Metadata = {
  title: 'JulineMart Gifts — Send a curated gift box',
  description: 'Ready-made gift boxes curated and packed at our Warri gift hub. One price, delivered with a personal message.',
};

export default async function GiftsLandingPage() {
  const { boxes, gfc } = await fetchGiftBoxes('warri');

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-white pb-24">
      <div className="container-custom py-6 md:py-10">
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 text-primary-700 mb-4">
            <Gift className="w-7 h-7" />
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-2">JulineMart Gifts</h1>
          <p className="text-sm md:text-base text-gray-600">
            Curated gift boxes — packed with care
            {gfc ? ` at our ${gfc.city} hub` : ''} and delivered to someone special.
          </p>
        </div>

        {boxes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-600 text-sm">Gift boxes coming soon — check back shortly.</p>
            <Link href="/" className="text-primary-600 text-sm font-medium mt-3 inline-block">
              Back to marketplace
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <Link
              href="/gifts/build"
              className="group bg-gradient-to-br from-primary-600 to-rose-600 rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow text-white sm:col-span-2 lg:col-span-1"
            >
              <div className="p-6 h-full flex flex-col justify-center min-h-[180px]">
                <Gift className="w-10 h-10 mb-3 opacity-90" />
                <h2 className="font-bold text-lg mb-1">Build your own box</h2>
                <p className="text-sm text-primary-100">Pick from our Warri pool · running total as you go</p>
              </div>
            </Link>
            {boxes.map((box) => (
              <Link
                key={box.id}
                href={`/gifts/boxes/${box.slug}`}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-primary-50 to-rose-100 relative overflow-hidden">
                  {box.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={box.image_url}
                      alt={box.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Gift className="w-16 h-16 text-primary-300" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-semibold text-gray-900 mb-1">{box.name}</h2>
                  {box.description ? (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-3">{box.description}</p>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-primary-700 font-bold">{formatPrice(box.list_price)}</span>
                    <span className="text-xs text-gray-500">{box.item_count} items</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
