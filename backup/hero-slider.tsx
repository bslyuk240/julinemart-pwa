import Link from 'next/link';

export default function HeroSlider() {
  return (
    <div className="relative overflow-hidden rounded-xl md:rounded-2xl 
      bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-400 
      px-4 py-6 md:px-6 md:py-10 
      text-white shadow-lg">
      <div className="relative z-10 grid gap-4 md:gap-6 lg:grid-cols-2 lg:items-center">
        <div className="space-y-3 md:space-y-4">
          <p className="text-[10px] md:text-sm uppercase tracking-[0.2em] text-white/80">JulineMart</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
            Everything you need, delivered with care.
          </h1>
          <p className="max-w-xl text-sm md:text-base text-white/90">
            Shop authentic products from trusted vendors across categories. New deals are added daily.
          </p>
          <div className="flex flex-wrap gap-2 md:gap-3">
            <Link
              href="/(shop)"
              className="rounded-lg bg-white 
                px-4 py-2 md:px-5 md:py-3 
                text-xs md:text-sm 
                font-semibold text-primary-700 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              Start shopping
            </Link>
            <Link
              href="/deals"
              className="rounded-lg border border-white/50 
                px-4 py-2 md:px-5 md:py-3 
                text-xs md:text-sm 
                font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              View deals
            </Link>
          </div>
        </div>

        <div className="relative hidden h-40 md:h-48 lg:h-60 items-center justify-center lg:flex">
          <div className="absolute inset-4 rounded-full bg-white/15 blur-3xl" />
          <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
            <div className="flex flex-col items-center gap-2 text-center text-white">
              <span className="text-3xl md:text-4xl">🛍️</span>
              <p className="text-sm md:text-lg font-semibold">Shop the latest arrivals</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}