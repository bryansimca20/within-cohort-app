import { Skeleton } from '@/components/ui/skeleton';

/** History skeleton: title + the two stat cards + a few day rows, matching the list so the real page lands with no shift. */
export default function HistoryLoading() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-[22px] pt-[18px] pb-6">
      <Skeleton className="h-7 w-36" />

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[68px] rounded-lg" />
        <Skeleton className="h-[68px] rounded-lg" />
      </div>

      <div className="flex flex-col gap-[10px]">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[68px] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
