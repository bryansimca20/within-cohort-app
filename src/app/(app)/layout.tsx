import type { ReactNode } from 'react';
import Link from 'next/link';
import { logout } from '@/app/login/actions';

// Chrome for every logged-in route: a header (wordmark + logout) and a
// bottom tab bar (Today / History). This is the *only* navigation surface
// once a member is inside the app: as an installed standalone PWA there is
// no browser chrome, so nothing here may assume a back button exists. Every
// screen either lives on a tab or is reached by an explicit button/link from
// one, and every server action redirects forward to a named route rather
// than relying on history.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-[var(--background)] px-4 py-3 dark:border-white/10">
        <span className="text-sm font-bold tracking-[0.3em]">WITHIN</span>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-[6px] border border-black/20 px-3 py-1.5 text-xs font-medium text-black/70 dark:border-white/20 dark:text-white/70"
          >
            Log out
          </button>
        </form>
      </header>

      <main className="flex-1 px-4 pt-6 pb-28">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-black/10 bg-[var(--background)] pb-[env(safe-area-inset-bottom)] dark:border-white/10">
        <div className="mx-auto flex max-w-md">
          <Link
            href="/today"
            className="flex flex-1 items-center justify-center py-4 text-sm font-medium"
          >
            Today
          </Link>
          <Link
            href="/history"
            className="flex flex-1 items-center justify-center py-4 text-sm font-medium"
          >
            History
          </Link>
        </div>
      </nav>
    </div>
  );
}
