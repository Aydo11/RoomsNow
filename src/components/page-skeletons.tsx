/** Placeholders shown instantly while a page loads, shaped like the real thing. */

function CardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <div className="skeleton h-44 rounded-none" />
      <div className="space-y-2.5 p-4">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3.5 w-1/2" />
        <div className="flex gap-2 pt-1">
          <div className="skeleton h-6 w-20 rounded-pill" />
          <div className="skeleton h-6 w-16 rounded-pill" />
        </div>
        <div className="skeleton mt-3 h-5 w-1/3" />
      </div>
    </div>
  );
}

export function GridSkeleton({ title = "Loading", cards = 6 }: { title?: string; cards?: number }) {
  return (
    <div className="shell py-8" role="status" aria-live="polite">
      <span className="sr-only">{title}…</span>
      <div className="skeleton h-8 w-64" />
      <div className="skeleton mt-3 h-4 w-96 max-w-full" />
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-8 w-24 rounded-pill" />)}
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }, (_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="shell py-8" role="status" aria-live="polite">
      <span className="sr-only">Loading advert…</span>
      <div className="skeleton h-4 w-48" />
      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="skeleton aspect-[16/9] w-full rounded-card" />
          <div className="skeleton mt-7 h-8 w-2/3" />
          <div className="skeleton mt-3 h-4 w-1/3" />
          <div className="mt-6 space-y-2.5">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-11/12" />
            <div className="skeleton h-4 w-4/5" />
          </div>
        </div>
        <div className="card space-y-3 p-5">
          <div className="skeleton h-6 w-1/2" />
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-11 w-full rounded-[10px]" />
          <div className="skeleton h-11 w-full rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}
