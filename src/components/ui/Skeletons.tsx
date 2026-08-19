/** Skeleton building blocks for route-level loading states. */

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/** Stage overview page: header + filter row + card grid. */
export function StageViewSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      role="status"
      aria-label="Loading"
    >
      <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="size-9 shrink-0" />
          <SkeletonBlock className="h-10 w-64" />
        </div>
        <SkeletonBlock className="hidden h-12 sm:block sm:w-[440px] lg:w-[560px]" />
      </header>

      <div className="mb-4 flex items-center gap-4 border-b border-border pb-3">
        <SkeletonBlock className="h-5 w-16" />
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-5 w-20" />
      </div>

      <div className="mb-6 flex items-center gap-3">
        <SkeletonBlock className="h-6 w-40" />
        <SkeletonBlock className="h-6 w-56" />
      </div>

      <CardGridSkeleton />
    </div>
  );
}

export function CardGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="animate-card-enter border border-border bg-surface"
          style={{ "--enter-delay": `${i * 60}ms` } as React.CSSProperties}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-4 w-20" />
            </div>
            <SkeletonBlock className="h-4 w-14" />
          </div>
          <div className="space-y-3 px-5 py-4">
            <SkeletonBlock className="h-5 w-3/4" />
            <div className="grid grid-cols-2 gap-px bg-border">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-2 bg-surface p-2.5">
                  <SkeletonBlock className="h-3 w-20" />
                  <SkeletonBlock className="h-3 w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-4 w-4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Workstream detail page: title header + quick view + phase cards. */
export function DetailViewSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1200px] px-4 pb-40 pt-4 sm:px-6 sm:pt-6"
      role="status"
      aria-label="Loading"
    >
      <header
        className="mb-6 animate-card-enter"
        style={{ "--enter-delay": "0ms" } as React.CSSProperties}
      >
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-5 w-24" />
        </div>
        <SkeletonBlock className="mt-3 h-10 w-2/3" />
      </header>

      <div
        className="mb-8 animate-card-enter bg-[#0D0D0D]"
        style={{ "--enter-delay": "70ms" } as React.CSSProperties}
      >
        <SkeletonBlock className="h-[2px] w-full" />
        <div className="flex items-center gap-3 px-5 py-3">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
        <div className="grid divide-y divide-foreground/[0.06] border-t border-foreground/[0.06] sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 px-5 py-4">
              <SkeletonBlock className="h-2.5 w-16" />
              <SkeletonBlock className="h-7 w-24" />
              <SkeletonBlock className="h-2.5 w-20" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-card-enter border border-border"
            style={
              { "--enter-delay": `${140 + i * 70}ms` } as React.CSSProperties
            }
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="space-y-2">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-7 w-48" />
              </div>
              <SkeletonBlock className="h-5 w-28" />
            </div>
            <div className="space-y-3 p-5">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-5/6" />
              <SkeletonBlock className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
