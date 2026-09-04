import { SkeletonBlock } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      role="status"
      aria-label="Loading"
    >
      <header className="mb-8 space-y-3">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-12 w-80 max-w-full" />
        <SkeletonBlock className="h-4 w-96 max-w-full" />
      </header>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-64 min-w-[180px] flex-1" />
        ))}
      </div>
      <SkeletonBlock className="mt-8 mb-3 h-4 w-32" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SkeletonBlock className="h-36" />
        <SkeletonBlock className="h-36" />
        <SkeletonBlock className="h-36" />
      </div>
    </div>
  );
}
