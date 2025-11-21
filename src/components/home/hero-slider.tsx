import Link from 'next/link';

export default function HeroSlider() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-400 px-6 py-10 text-white shadow-lg">
      <div className="relative z-10 grid gap-6 lg:grid-cols-2 lg:items-center">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-white/80">JulineMart</p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Everything you need, delivered with care.
          </h1>
          <p className="max-w-xl text-white/90">
            Shop authentic products from trusted vendors across categories. New deals are added
            daily.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/(shop)"
              className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-primary-700 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Start shopping
            </Link>
            <Link
              href="/deals"
              className="rounded-lg border border-white/50 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              View deals
            </Link>
          </div>
        </div>

        <div className="relative hidden h-60 items-center justify-center lg:flex">
          <div className="absolute inset-4 rounded-full bg-white/15 blur-3xl" />
          <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
            <div className="flex flex-col items-center gap-2 text-center text-white">
              <span className="text-4xl">🛍️</span>
              <p className="text-lg font-semibold">Shop the latest arrivals</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
