import { Skeleton } from '@/components/ui/skeleton';
import { BASELINE_DAYS, WITHIN_DAYS } from '@/lib/phase';

/** Today skeleton: mirrors the black home layout (greeting, phase counter + streak, the two ledgers, status rows, actions) so the real screen lands with no shift. Viewport-locked like the page itself. */
export default function TodayLoading() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-[22px] pb-5">
        <Skeleton className="h-8 w-52" />

        <div className="mt-5 flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-14 w-28" />
            <Skeleton className="h-3 w-44" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>

        {[BASELINE_DAYS, WITHIN_DAYS].map((cells, ledger) => (
          <div key={ledger} className="mt-3">
            <div className="flex items-center justify-between border-b border-wi-on-dark-line pb-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="mt-[10px] grid grid-cols-14 gap-[4px]">
              {Array.from({ length: cells }, (_, i) => (
                <Skeleton key={i} className="h-5 rounded-[3px]" />
              ))}
            </div>
          </div>
        ))}

        <div className="mt-4 flex flex-col gap-3 border-t border-wi-on-dark-line pt-3">
          <Skeleton className="h-[30px] w-full" />
          <Skeleton className="h-[30px] w-full" />
        </div>

        <div className="mt-auto grid grid-cols-2 gap-[10px] pt-5">
          <Skeleton className="h-[74px]" />
          <Skeleton className="h-[74px]" />
        </div>
      </div>
    </div>
  );
}
