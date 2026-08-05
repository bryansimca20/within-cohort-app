import { Suspense, type ReactNode } from 'react';
import { WithinLogo } from '@/components/brand/WithinLogo';
import { RunnerNav } from '@/components/RunnerNav';
import { Toast } from '@/components/Toast';

/** Chrome for every logged-in route: one persistent black header (WITHIN logotype only) up top, a scrollable
 *  content area, and the bottom tab bar. The whole runner app is black, so the header and every page share the
 *  same surface — the logotype is always present.
 *
 *  The shell is a fixed viewport-height (dvh) flex column that scrolls INTERNALLY (`main` is the only scroller);
 *  the nav is the last in-flow child, so it sits at the column's bottom edge by document layout rather than by
 *  `position: fixed`. That is deliberate: an iOS home-screen PWA mis-anchors `fixed; bottom:0` on the first
 *  paint (it renders raised until the first navigation reflows it), whereas an in-flow bar is placed correctly
 *  from the start. On wider screens the same column is capped to a centered phone-width frame on a light
 *  backdrop. Admin routes are intentionally full-width (their own layout). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh overflow-hidden bg-wi-black md:flex md:justify-center md:bg-wi-paper-dim md:py-8">
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-wi-black text-wi-paper md:h-[calc(100dvh-4rem)] md:max-w-md md:rounded-lg md:border md:border-wi-line md:shadow-(--wi-shadow-lg)">
        <header className="flex w-full items-center px-[22px] pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
          <WithinLogo color="white" height={18} priority />
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>

        <Suspense fallback={null}>
          <Toast />
        </Suspense>
        <RunnerNav />
      </div>
    </div>
  );
}
