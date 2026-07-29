import { Suspense, type ReactNode } from 'react';
import { WithinLogo } from '@/components/brand/WithinLogo';
import { RunnerNav } from '@/components/RunnerNav';
import { Toast } from '@/components/Toast';

/** Chrome for every logged-in route: one persistent black header (WITHIN logotype only) up top, the fixed
 *  bottom tab bar below, and the save-confirmation toast. The whole runner app is black, so the header and
 *  every page share the same surface — the logotype is always present. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-wi-black text-wi-paper">
      <header className="mx-auto flex w-full max-w-md items-center px-[22px] pt-4 pb-3">
        <WithinLogo color="white" height={18} />
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      <RunnerNav />
    </div>
  );
}
