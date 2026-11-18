import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail, ShieldAlert, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import MobileTopBar from '@/components/mobile/shell/mobile-top-bar';
import { getMobileTierRoute } from '@/lib/mobile/mobile-tier-routes';
import { ACCOUNT_DELETION_EMAIL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Account Deletion | JulineMart',
  description:
    'How to request deletion of your JulineMart account and what data is deleted or retained.',
};

const deletedData = [
  'Profile information',
  'Saved addresses',
  'Login credentials',
  'Preferences',
  'Marketing data',
  'JulinePoints balance (forfeited when the account is deleted)',
];

const retainedData = [
  'Transaction records, retained for up to 7 years for tax and accounting compliance',
  'Vendor payout records, retained for up to 7 years',
  'Support communications, retained for up to 3 years',
];

export default function AccountDeletionPage() {
  // Mobile tier (docs/mobile-tier-plan.md, M12): top bar carries the title; the
  // policy reads edge to edge below md. Desktop is unchanged.
  const tier = getMobileTierRoute('/account-deletion') !== null;

  return (
    <main className={clsx('min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24 md:pb-12', tier && 'max-md:bg-none max-md:bg-m-surface max-md:pb-6')}>
      {tier && (
        <div className="sticky top-0 z-m-header bg-m-surface md:hidden">
          <MobileTopBar title="Account deletion" backHref="/" />
        </div>
      )}
      <div className={clsx('container mx-auto max-w-4xl px-4 py-6', tier && 'max-md:py-2')}>
        <div className={clsx('mb-6', tier && 'max-md:hidden')}>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary-600 transition-colors hover:text-primary-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        {tier && (
          <p className="mb-4 text-m-body-l text-m-on-surface-variant md:hidden">
            You can ask us to delete your JulineMart account and personal data at any time.
          </p>
        )}

        <article className={clsx('overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm', tier && 'max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:shadow-none')}>
          <header className={clsx('bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8 text-white md:px-8', tier && 'max-md:hidden')}>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <Trash2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/75">
                  Privacy Request
                </p>
                <h1 className="mt-2 text-3xl font-bold md:text-4xl">JulineMart Account Deletion</h1>
                <p className="mt-3 max-w-2xl text-sm text-white/90 md:text-base">
                  Users may request deletion of their JulineMart account and associated personal
                  data at any time.
                </p>
              </div>
            </div>
          </header>

          <div className={clsx('space-y-8 px-6 py-8 md:px-8', tier && 'max-md:space-y-4 max-md:px-0 max-md:py-0')}>
            <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">How to delete your account</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    The quickest way is to sign in and go to{' '}
                    <Link href="/account/delete" className="font-medium text-primary-600 underline underline-offset-2">
                      Account, Settings, Delete my account
                    </Link>
                    . We email you a confirmation link, and your account is deleted once you confirm.
                  </p>
                  <p className="mt-3 text-sm leading-6 text-gray-700">
                    Can&apos;t sign in? Send a deletion request to{' '}
                    <a
                      href={`mailto:${ACCOUNT_DELETION_EMAIL}`}
                      className="font-medium text-primary-600 underline underline-offset-2"
                    >
                      {ACCOUNT_DELETION_EMAIL}
                    </a>{' '}
                    from the email address registered on your JulineMart account. Our team will
                    verify your identity before the request is processed.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">What data will be deleted</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                When an account deletion request is approved, the following information will be
                permanently deleted from active systems:
              </p>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {deletedData.map((item) => (
                  <li
                    key={item}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">Data that may be retained</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Certain records may be retained where required for legal, tax, fraud-prevention, or
                operational purposes.
              </p>
              <ul className="mt-4 space-y-3">
                {retainedData.map((item) => (
                  <li
                    key={item}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-700"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="text-xl font-semibold text-gray-900">Backup retention</h2>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                Deleted data may remain in secure backups for up to 90 days before permanent
                removal.
              </p>
            </section>

            <section className="rounded-2xl bg-primary-50 p-5">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Support contact</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    For account deletion requests or follow-up questions, contact{' '}
                    <a
                      href={`mailto:${ACCOUNT_DELETION_EMAIL}`}
                      className="font-medium text-primary-600 underline underline-offset-2"
                    >
                      {ACCOUNT_DELETION_EMAIL}
                    </a>
                    .
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-gray-500">
                    Last updated: November 18, 2026
                  </p>
                </div>
              </div>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
