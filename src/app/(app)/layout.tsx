import { Suspense, type ReactNode } from 'react';
import { WithinLogo } from '@/components/brand/WithinLogo';
import { RunnerNav } from '@/components/RunnerNav';
import { Toast } from '@/components/Toast';

/** Chrome for every logged-in route: one persistent black header (WITHIN logotype only) up top, the fixed
 *  bottom tab bar below, and the save-confirmation toast. The whole runner app is black, so the header and
 *  every page share the same surface — the logotype is always present.
 *
 *  On phones it is full-bleed black. On wider screens (web) the whole runner experience is capped to a
 *  centered phone-width column, framed on a light backdrop, so it reads as the mobile app it is: the column
 *  is a fixed viewport-height box that scrolls internally, and the nav pins to the column's bottom edge
 *  (md:absolute) rather than the window's. Admin routes are intentionally full-width (their own layout). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-wi-black md:flex md:justify-center md:bg-wi-paper-dim md:py-8">
      <div className="relative flex min-h-dvh w-full flex-col bg-wi-black text-wi-paper md:h-[calc(100dvh-4rem)] md:min-h-0 md:max-w-md md:overflow-hidden md:rounded-lg md:border md:border-wi-line md:shadow-(--wi-shadow-lg)">
        <header className="flex w-full items-center px-[22px] pt-4 pb-3">
          <WithinLogo color="white" height={18} priority />
        </header>

        <main className="flex flex-1 flex-col md:overflow-y-auto">{children}</main>

        <Suspense fallback={null}>
          <Toast />
        </Suspense>
        <RunnerNav />
      </div>
    </div>
  );
}
