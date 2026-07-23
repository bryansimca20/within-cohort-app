import type { ReactNode } from 'react';
import Link from 'next/link';
import { logout } from '@/app/login/actions';

// Chrome for every founder/admin route: a header (wordmark + back-to-runner
// + logout) and a nav row for the dashboard, member management, and the two
// raw CSV exports. The layout itself never writes data; /admin/members is
// the one child route that does (roster + passcode management), gated by
// its own requireAdmin() call.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-[var(--background)] px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-[0.3em]">WITHIN</span>
          <span className="rounded-[6px] border border-black/20 px-2 py-0.5 text-xs font-medium uppercase tracking-[0.15em] opacity-70 dark:border-white/20">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/today"
            className="rounded-[6px] border border-black/20 px-3 py-1.5 text-xs font-medium text-black/70 dark:border-white/20 dark:text-white/70"
          >
            Runner app
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-[6px] border border-black/20 px-3 py-1.5 text-xs font-medium text-black/70 dark:border-white/20 dark:text-white/70"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <nav className="border-b border-black/10 px-4 py-2 dark:border-white/10">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-4 text-xs font-medium uppercase tracking-[0.15em]">
          <Link href="/admin" className="opacity-70 hover:opacity-100">
            Dashboard
          </Link>
          <Link href="/admin/members" className="opacity-70 hover:opacity-100">
            Members
          </Link>
          <a href="/admin/export?type=checkins" className="opacity-70 hover:opacity-100">
            Export check-ins
          </a>
          <a href="/admin/export?type=sessions" className="opacity-70 hover:opacity-100">
            Export sessions
          </a>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
