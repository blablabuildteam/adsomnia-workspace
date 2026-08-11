import { CardGridSkeleton, SkeletonBlock } from "@/components/ui/Skeletons";

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
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
      </div>
      <CardGridSkeleton />
    </div>
  );
}
