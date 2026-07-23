import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { HistoryIcon, HomeIcon, LogOutIcon } from 'lucide-react';
import { logout } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-wi-line bg-wi-paper px-4 py-3">
        <span className="text-sm font-bold tracking-[0.3em] text-wi-black">WITHIN</span>
        <form action={logout}>
          <Button type="submit" variant="secondary" size="sm">
            <LogOutIcon />
            Log out
          </Button>
        </form>
      </header>

      <main className="flex-1 px-4 pt-6 pb-28">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-wi-line bg-wi-paper pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md">
          <NavLink href="/today" icon={HomeIcon}>
            Today
          </NavLink>
          <NavLink href="/history" icon={HistoryIcon}>
            History
          </NavLink>
        </div>
      </nav>
    </div>
  );
}

/** Bottom-tab link: icon over label, sized for a one-handed thumb tap. */
function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-bold uppercase tracking-[0.1em] text-wi-black transition-colors duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] active:opacity-60'
      )}
    >
      <Icon className="size-5" />
      {children}
    </Link>
  );
}
