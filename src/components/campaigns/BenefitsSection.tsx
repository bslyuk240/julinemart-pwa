import { ShieldCheck, Users, Truck, CheckCircle2, type LucideIcon } from 'lucide-react';
import type { CampaignBenefit } from '@/types/campaigns';

const ICONS: LucideIcon[] = [CheckCircle2, ShieldCheck, Users, Truck];

const DEFAULT_BENEFITS: CampaignBenefit[] = [
  { title: 'Convenient ordering', description: 'Order in under a minute — no account hassle.' },
  { title: 'Secure payment', description: 'Every transaction protected end-to-end.' },
  { title: 'Trusted local vendors', description: 'Verified sellers, vetted by JulineMart.' },
  { title: 'Delivery or pickup', description: 'Get it delivered, or collect same-day.' },
];

export default function BenefitsSection({ benefits }: { benefits?: CampaignBenefit[] }) {
  const items = benefits?.length ? benefits : DEFAULT_BENEFITS;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <p className="mb-5 text-xs font-extrabold uppercase tracking-wide text-primary-600">
        Why shop through JulineMart
      </p>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {items.map((benefit, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <div key={benefit.title}>
              <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <h3 className="mb-1 text-sm font-extrabold text-gray-900">{benefit.title}</h3>
              <p className="text-xs text-gray-500">{benefit.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
