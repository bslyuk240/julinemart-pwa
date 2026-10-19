'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, MessageCircle, Store, ChevronRight, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';
import MobileTopBar from '@/components/mobile/shell/mobile-top-bar';

const JLO_API = process.env.NEXT_PUBLIC_JLO_CATALOG_URL || 'https://jlo.julinemart.com';

// Quick ways to reach us, shown as a list on phones (same details as the desktop card).
const REACH_US = [
  { icon: MessageCircle, title: 'Chat on WhatsApp', detail: '+234 707 582 5761 · available 24/7', href: 'https://wa.me/2347075825761', external: true },
  { icon: Phone, title: 'Call us', detail: '+234 707 582 5761', href: 'tel:+2347075825761', external: false },
  { icon: Mail, title: 'Email support', detail: 'support@julinemart.com', href: 'mailto:support@julinemart.com', external: false },
  {
    icon: MapPin,
    title: 'Visit us',
    detail: 'No. 9 Jesus Is Lord Street, off Refinery Road, Effurun, Warri',
    href: 'https://maps.google.com/?q=No.+9+Jesus+Is+Lord+Street,+Effurun,+Warri,+Delta+State',
    external: true,
  },
];

export default function ContactPage() {
  // Mobile tier (docs/mobile-tier-plan.md, M12): contact rows first, then the form, below md.
  const tier = useMobileTier() !== null;
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${JLO_API}/.netlify/functions/contact-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        setForm({ name: '', email: '', subject: '', message: '' });
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Could not send message. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={clsx('min-h-screen bg-gray-50 py-12 px-4', tier && 'max-md:bg-m-surface-low max-md:px-0 max-md:pb-24 max-md:pt-0')}>
      {tier && (
        <div className="sticky top-0 z-m-header bg-m-surface-low md:hidden">
          <MobileTopBar title="Contact us" backHref="/" />
        </div>
      )}
      <div className={clsx('max-w-5xl mx-auto', tier && 'max-md:space-y-3 max-md:px-4')}>

        {tier && (
          <section aria-label="Reach us" className="rounded-2xl bg-m-surface-lowest shadow-[0_0_0_1px_rgb(30_26_31/0.07)] md:hidden">
            <h2 className="px-4 pb-1 pt-3 text-m-title-s text-m-on-surface-variant">Reach us</h2>
            {REACH_US.map((item) => (
              <a
                key={item.title}
                href={item.href}
                {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                className="flex min-h-14 items-center gap-4 px-4 py-2 active:bg-black/5"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-m-primary-container">
                  <item.icon className="h-5 w-5 text-m-on-primary-container" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium leading-5 text-m-on-surface">{item.title}</span>
                  <span className={clsx('block text-m-body-s text-m-on-surface-variant', item.icon === MapPin ? 'line-clamp-2' : 'truncate')}>
                    {item.detail}
                  </span>
                </span>
                {item.external ? (
                  <ExternalLink className="h-[18px] w-[18px] shrink-0 text-m-on-surface-variant" aria-hidden />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-m-on-surface-variant" aria-hidden />
                )}
              </a>
            ))}
            <p className="border-t border-m-outline-variant px-4 py-3 text-m-body-s text-m-on-surface-variant">
              Payment or delivery problems: reply within 2 hours. Other questions: within 24 hours. Complex cases: within 48 hours.
            </p>
          </section>
        )}

        {/* Header */}
        <div className={clsx('text-center mb-12', tier && 'max-md:hidden')}>
          <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            Have a question, feedback, or need help with your order? We&apos;d love to hear from you.
          </p>
        </div>

        <div className={clsx('grid grid-cols-1 lg:grid-cols-5 gap-8', tier && 'max-md:gap-3')}>

          {/* Contact info */}
          <div className={clsx('lg:col-span-2 space-y-6', tier && 'max-md:hidden')}>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <h2 className="font-semibold text-gray-800 text-lg">Get in touch</h2>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Email</p>
                  <a href="mailto:support@julinemart.com" className="text-sm font-medium text-gray-800 hover:text-purple-600 transition-colors">
                    support@julinemart.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Phone / WhatsApp</p>
                  <a href="tel:+2347075825761" className="text-sm font-medium text-gray-800 hover:text-purple-600 transition-colors">
                    +234 707 582 5761
                  </a>
                  <p className="text-xs text-gray-500 mt-0.5">WhatsApp available 24/7</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Address</p>
                  <p className="text-sm font-medium text-gray-800">No. 9 Jesus Is Lord Street</p>
                  <p className="text-sm text-gray-600">Off Refinery Road, Effurun</p>
                  <p className="text-sm text-gray-600">Warri, Delta State, Nigeria</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Response Times</p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>⚡ Urgent (payment/delivery): <span className="font-medium text-gray-800">within 2 hours</span></p>
                  <p>💬 General inquiries: <span className="font-medium text-gray-800">within 24 hours</span></p>
                  <p>🔍 Complex cases: <span className="font-medium text-gray-800">within 48 hours</span></p>
                </div>
              </div>
            </div>

            <div className="bg-purple-600 rounded-2xl p-6 text-white">
              <h3 className="font-semibold text-lg mb-2">Want to sell on JulineMart?</h3>
              <p className="text-sm text-purple-100 mb-4">
                Join our growing network of vendors and reach thousands of customers across Nigeria.
              </p>
              <a
                href="https://vendors.julinemart.com"
                className="inline-block bg-white text-purple-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors"
              >
                Apply as a Vendor
              </a>
            </div>
          </div>

          {/* Form */}
          <div className={clsx('lg:col-span-3', tier && 'max-md:space-y-3')}>
            <div className={clsx('bg-white rounded-2xl border border-gray-100 p-6 sm:p-8', tier && 'max-md:border-0 max-md:bg-m-surface-lowest max-md:p-4 max-md:shadow-[0_0_0_1px_rgb(30_26_31/0.07)]')}>
              {sent ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Message sent!</h2>
                  <p className="text-gray-500 text-sm max-w-xs">
                    Thanks for reaching out. Our team will get back to you within 1–2 business days.
                  </p>
                  <button
                    onClick={() => setSent(false)}
                    className={clsx('mt-6 text-sm text-purple-600 hover:underline', tier && 'max-md:min-h-12 max-md:px-4 max-md:text-m-label-l max-md:text-m-primary')}
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className={clsx('text-lg font-semibold text-gray-800 mb-1', tier && 'max-md:text-m-title-m max-md:text-m-on-surface')}>Send us a message</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Your Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                        placeholder="Jane Doe"
                        autoComplete="name"
                        className={clsx('w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400', tier && 'max-md:h-12 max-md:rounded-lg max-md:border-m-outline max-md:px-4 max-md:text-base')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email Address <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        placeholder="jane@example.com"
                        autoComplete="email"
                        className={clsx('w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400', tier && 'max-md:h-12 max-md:rounded-lg max-md:border-m-outline max-md:px-4 max-md:text-base')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => set('subject', e.target.value)}
                      placeholder="Order issue, product question…"
                      className={clsx('w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400', tier && 'max-md:h-12 max-md:rounded-lg max-md:border-m-outline max-md:px-4 max-md:text-base')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      required
                      rows={6}
                      value={form.message}
                      onChange={(e) => set('message', e.target.value)}
                      placeholder="Tell us how we can help…"
                      className={clsx('w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 resize-none', tier && 'max-md:rounded-lg max-md:border-m-outline max-md:px-4 max-md:py-3 max-md:text-base')}
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className={clsx('w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm', tier && 'max-md:h-12 max-md:rounded-full max-md:bg-m-primary max-md:py-0 max-md:text-m-label-l max-md:text-m-on-primary')}
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {tier && (
              <a
                href="https://vendors.julinemart.com"
                className="flex min-h-16 items-center gap-4 rounded-2xl bg-m-surface-lowest px-4 py-2 shadow-[0_0_0_1px_rgb(30_26_31/0.07)] active:bg-black/5 md:hidden"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-m-primary-container">
                  <Store className="h-5 w-5 text-m-on-primary-container" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium leading-5 text-m-on-surface">Sell on JulineMart</span>
                  <span className="block text-m-body-s text-m-on-surface-variant">Apply as a vendor and reach shoppers across Nigeria</span>
                </span>
                <ExternalLink className="h-[18px] w-[18px] shrink-0 text-m-on-surface-variant" aria-hidden />
              </a>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
