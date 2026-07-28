import type { ReactNode } from 'react';
import { RunnerNav } from '@/components/RunnerNav';

/** Chrome for every logged-in route: no header, just the fixed bottom tab bar. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="flex-1 pb-24">{children}</main>
      <RunnerNav />
    </div>
  );
}
