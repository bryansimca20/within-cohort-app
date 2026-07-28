import { Suspense, type ReactNode } from 'react';
import { RunnerNav } from '@/components/RunnerNav';
import { Toast } from '@/components/Toast';

/** Chrome for every logged-in route: no header, just the fixed bottom tab bar and the save-confirmation toast. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="flex-1 pb-24">{children}</main>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      <RunnerNav />
    </div>
  );
}
