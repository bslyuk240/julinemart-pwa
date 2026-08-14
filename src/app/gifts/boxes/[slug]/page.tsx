import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Gift, ArrowRight } from 'lucide-react';
import { fetchGiftBoxBySlug } from '@/lib/jlo/gifts';
import { formatPrice } from '@/lib/utils/format-price';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { box } = await fetchGiftBoxBySlug(slug);
  if (!box) return { title: 'Gift box | JulineMart Gifts' };
  return {
    title: `${box.name} | JulineMart Gifts`,
    description: box.description || `Send the ${box.name} curated gift box.`,
  };
}

export default async function GiftBoxPage({ params }: Props) {
  const { slug } = await params;
  const { box, gfc } = await fetchGiftBoxBySlug(slug);
  if (!box) notFound();

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="container-custom py-5 md:py-8 max-w-3xl">
        <PageHeader title={box.name} backHref="/gifts" backLabel="All gift boxes" />

        <div className="bg-white rounded-2xl border overflow-hidden shadow-sm mb-6">
          <div className="aspect-video bg-gradient-to-br from-primary-50 to-rose-100 relative">
            {box.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={box.image_url} alt={box.name} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Gift className="w-20 h-20 text-primary-300" />
              </div>
            )}
          </div>
          <div className="p-5 md:p-6">
            <p className="text-2xl font-bold text-primary-700 mb-3">{formatPrice(box.list_price)}</p>
            {box.description ? (
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">{box.description}</p>
            ) : null}
            {gfc ? (
              <p className="text-xs text-gray-500 mb-4">
                Packed at {gfc.name} · {gfc.city}, {gfc.state}
              </p>
            ) : null}

            {box.contents.length > 0 && (
              <div className="border-t pt-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">What&apos;s inside</h2>
                <ul className="space-y-2">
                  {box.contents.map((item) => (
                    <li key={item.product_id} className="flex items-center gap-3 text-sm text-gray-700">
                      <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-medium">
                        {item.quantity}×
                      </span>
                      <span>{item.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <Link href={`/gifts/checkout?box=${encodeURIComponent(box.slug)}`}>
          <Button className="w-full h-12 text-base gap-2">
            Send this gift
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </main>
  );
}
