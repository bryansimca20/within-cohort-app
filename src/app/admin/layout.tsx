import type { ReactNode } from 'react';
import Link from 'next/link';
import { DownloadIcon, LayoutDashboardIcon, LogOutIcon, UsersIcon } from 'lucide-react';
import { logout } from '@/app/login/actions';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Chrome for every founder/admin route: a header (wordmark + back-to-runner
// + logout) and a nav row for the dashboard, member management, and the two
// raw CSV exports. The layout itself never writes data; /admin/members is
// the one child route that does (roster + passcode management), gated by
// its own requireAdmin() call.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-wi-line bg-wi-paper px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-[0.3em] text-wi-black">WITHIN</span>
          <Badge variant="outline">Admin</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/today" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Runner app
          </Link>
          <form action={logout}>
            <Button type="submit" variant="secondary" size="sm">
              <LogOutIcon />
              Log out
            </Button>
          </form>
        </div>
      </header>

      <nav className="border-b border-wi-line bg-wi-paper px-4 py-2.5">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-5">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-[0.14em] text-wi-ink-500 transition-colors hover:text-wi-black"
          >
            <LayoutDashboardIcon className="size-3.5" />
            Dashboard
          </Link>
          <Link
            href="/admin/members"
            className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-[0.14em] text-wi-ink-500 transition-colors hover:text-wi-black"
          >
            <UsersIcon className="size-3.5" />
            Members
          </Link>
          <a
            href="/admin/export?type=checkins"
            className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-[0.14em] text-wi-ink-500 transition-colors hover:text-wi-black"
          >
            <DownloadIcon className="size-3.5" />
            Export check-ins
          </a>
          <a
            href="/admin/export?type=sessions"
            className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-[0.14em] text-wi-ink-500 transition-colors hover:text-wi-black"
          >
            <DownloadIcon className="size-3.5" />
            Export sessions
          </a>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
