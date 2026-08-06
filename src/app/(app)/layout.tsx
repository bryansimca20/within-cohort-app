import { Suspense, type ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { WithinLogo } from '@/components/brand/WithinLogo';
import { RunnerNav } from '@/components/RunnerNav';
import { Toast } from '@/components/Toast';
import { requireMember } from '@/lib/session';

/** Chrome for every logged-in route: one persistent black header (WITHIN logotype only) up top, a scrollable
 *  content area, and the bottom tab bar. The whole runner app is black, so the header and every page share the
 *  same surface — the logotype is always present.
 *
 *  On phones it is full-bleed black. On wider screens (web) the whole runner experience is capped to a
 *  centered phone-width column, framed on a light backdrop, so it reads as the mobile app it is: the column
 *  is a fixed viewport-height box that scrolls internally, and the nav pins to the column's bottom edge
 *  (md:absolute) rather than the window's. Admin routes are intentionally full-width (their own layout). */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const member = await requireMember();
  if (member.onboardedAt == null) redirect('/welcome');
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
