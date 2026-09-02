import { z } from 'zod';

// Nigerian phone format — same regex used in checkout/signup
// (src/app/signup/page.tsx, src/lib/utils/helpers.ts) so validation behaves
// identically across the app.
const NG_PHONE_RE = /^(\+234|0)[789]\d{9}$/;

export const giveawayCodeSchema = z.object({
  campaignId: z.string().optional(),
  slug: z.string().optional(),
  code: z.string().min(1, 'Enter the secret code'),
});

export const giveawayEntrySchema = z
  .object({
    campaignId: z.string().optional(),
    slug: z.string().optional(),
    code: z.string().min(1),
    fullName: z.string().trim().min(2, 'Enter your full name').max(120),
    whatsappNumber: z
      .string()
      .trim()
      .regex(NG_PHONE_RE, 'Enter a valid Nigerian WhatsApp number'),
    // Required — winner/reward notifications need a real address; a
    // WhatsApp-only entry had no way to receive them.
    email: z.string().trim().email('Enter a valid email address'),
    location: z.string().trim().max(80).optional(),
    marketingOptIn: z.boolean().optional(),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the giveaway terms' }),
    }),
    source: z.string().optional(),
  })
  .refine((data) => data.campaignId || data.slug, {
    message: 'campaignId or slug is required',
    path: ['campaignId'],
  });

export type GiveawayEntryInput = z.infer<typeof giveawayEntrySchema>;
