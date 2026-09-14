'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DownloadIcon, LayoutDashboardIcon, UsersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type AdminTab = 'dashboard' | 'members';

/** Which admin tab a pathname belongs to, or null outside the admin area. */
export function activeAdminTab(pathname: string): AdminTab | null {
  if (pathname === '/admin/members') return 'members';
  // The singular /admin/member/[id] drill-down is reached from the dashboard
  // roster, so it keeps the dashboard lit. The trailing slash matters: without
  // it this prefix also swallows /admin/members above.
  if (pathname === '/admin' || pathname.startsWith('/admin/member/')) return 'dashboard';
  return null;
}

const tabClass = 'flex items-center gap-1.5 border-b-2 py-2.5 text-2xs font-bold uppercase tracking-[0.14em] transition-colors';
const inactiveClass = 'border-transparent text-wi-ink-500 hover:text-wi-black';
const activeClass = 'border-wi-black text-wi-black';

// The admin tab row. Client-side only because it needs the current pathname to
// mark the active tab; the layout around it stays a server component. The two
// export links are file downloads rather than routes, so they never activate.
export function AdminNav() {
  const active = activeAdminTab(usePathname());

  return (
    <nav className="border-b border-wi-line bg-wi-paper px-4">
      <div className="mx-auto flex max-w-3xl flex-wrap gap-5">
        <Link
          href="/admin"
          aria-current={active === 'dashboard' ? 'page' : undefined}
          className={cn(tabClass, active === 'dashboard' ? activeClass : inactiveClass)}
        >
          <LayoutDashboardIcon className="size-3.5" />
          Dashboard
        </Link>
        <Link
          href="/admin/members"
          aria-current={active === 'members' ? 'page' : undefined}
          className={cn(tabClass, active === 'members' ? activeClass : inactiveClass)}
        >
          <UsersIcon className="size-3.5" />
          Members
        </Link>
        <a href="/admin/export?type=checkins" className={cn(tabClass, inactiveClass)}>
          <DownloadIcon className="size-3.5" />
          Export check-ins
        </a>
        <a href="/admin/export?type=sessions" className={cn(tabClass, inactiveClass)}>
          <DownloadIcon className="size-3.5" />
          Export sessions
        </a>
      </div>
    </nav>
  );
}
