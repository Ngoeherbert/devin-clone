export function ImageGenSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface-1">
          <div className="relative h-24 overflow-hidden bg-surface-2">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-surface-3 to-transparent" />
          </div>
          <div className="p-2.5">
            <div className="h-3 w-3/4 rounded bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
