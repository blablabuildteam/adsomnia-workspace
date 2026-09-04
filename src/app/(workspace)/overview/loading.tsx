import { SkeletonBlock } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      role="status"
      aria-label="Loading"
    >
      <header className="mb-8 space-y-3">
        <SkeletonBlock className="h-10 w-72" />
        <SkeletonBlock className="h-4 w-96 max-w-full" />
      </header>
      <div className="flex flex-col">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i}>
            <div className="border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <SkeletonBlock className="size-6" />
                  <SkeletonBlock className="h-4 w-40" />
                </div>
                <SkeletonBlock className="h-6 w-8" />
              </div>
              <div className="space-y-3 px-4 py-4">
                <SkeletonBlock className="h-4 w-2/3" />
                <SkeletonBlock className="h-4 w-1/2" />
              </div>
            </div>
            {i < 6 ? <div className="h-8" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
