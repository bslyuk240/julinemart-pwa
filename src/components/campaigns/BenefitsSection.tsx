import { ShieldCheck, BadgeCheck, Truck, RotateCcw, type LucideIcon } from 'lucide-react';
import type { CampaignBenefit } from '@/types/campaigns';

const ICONS: LucideIcon[] = [ShieldCheck, Truck, RotateCcw, BadgeCheck];

// Defaults state things JulineMart actually does: Paystack checkout, Fez
// delivery booked on payment, refunds within 7 days of an approved return,
// verified vendors. Campaign admins can still override them per section.
const DEFAULT_BENEFITS: CampaignBenefit[] = [
  { title: 'Secure checkout', description: 'Pay safely with Paystack.' },
  { title: 'Tracked delivery', description: 'Shipped with Fez, tracked to your door.' },
  { title: 'Easy returns', description: 'Refunds within 7 days of an approved return.' },
  { title: 'Verified vendors', description: 'Every seller is vetted by JulineMart.' },
];

export default function BenefitsSection({ benefits }: { benefits?: CampaignBenefit[] }) {
  const items = benefits?.length ? benefits : DEFAULT_BENEFITS;

  return (
    <section aria-labelledby="campaign-benefits-title" className="rounded-3xl bg-white px-5 py-5 ring-1 ring-gray-200/70 sm:px-8 sm:py-6">
      <h2 id="campaign-benefits-title" className="sr-only">
        Why shop with JulineMart
      </h2>
      <ul className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {items.map((benefit, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <li key={benefit.title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gray-100 text-gray-900">
                <Icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-sm font-semibold text-gray-900">{benefit.title}</h3>
                <p className="text-xs leading-relaxed text-gray-500">{benefit.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
