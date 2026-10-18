/** Final-shape placeholder for a product listing (replaces the full-screen spinner on mobile). */
export default function ListingSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading products" className="md:hidden">
      <div className="-mx-4 mb-3 flex gap-2 overflow-hidden px-4 pt-1">
        {[104, 88, 96, 80].map((width) => (
          <span key={width} className="h-8 shrink-0 animate-pulse rounded-lg bg-m-surface-container motion-reduce:animate-none" style={{ width }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5">
        {Array.from({ length: count }, (_, i) => (
          <div key={i}>
            <div className="aspect-square animate-pulse rounded-m-card bg-m-surface-container motion-reduce:animate-none" />
            <div className="mt-3 h-3 animate-pulse rounded bg-m-surface-container motion-reduce:animate-none" />
            <div className="mt-2 h-3 w-[70%] animate-pulse rounded bg-m-surface-container motion-reduce:animate-none" />
            <div className="mt-3 h-[18px] w-[45%] animate-pulse rounded bg-m-surface-container motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
