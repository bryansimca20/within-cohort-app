import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, LogOutIcon } from 'lucide-react';
import { logout } from '@/app/login/actions';
import { AdminNav } from './AdminNav';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { SubmitButton } from '@/components/SubmitButton';
import { cn } from '@/lib/utils';

// Chrome for every founder/admin route: a header (wordmark + back-to-runner
// + logout) and the tab row for the dashboard, member management, and the two
// raw CSV exports. The tab row is split into AdminNav because marking the
// active tab needs the current pathname, which is client-only; this layout
// stays a server component. The layout itself never writes data;
// /admin/members is the one child route that does (roster + passcode
// management), gated by its own requireAdmin() call.
//
// Installed as a home-screen app the web view runs edge to edge (the root
// layout sets viewport-fit=cover + a translucent status bar), so this header
// pads itself past the status bar and the content area past the home
// indicator. Without those insets the wordmark and the two header controls
// render underneath the clock and battery, which is what made the runner-app
// link unreachable on a phone. Below `sm` the Admin badge and the logout
// label drop out so the runner-app link always keeps its full tap target.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-10 border-b border-wi-line bg-wi-paper px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-sm font-bold tracking-[0.3em] text-wi-black">WITHIN</span>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Admin
            </Badge>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/today" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              <ArrowLeftIcon />
              Runner app
            </Link>
            <form action={logout}>
              <SubmitButton
                variant="secondary"
                size="sm"
                aria-label="Log out"
                className="px-3 sm:px-[14px]"
                pendingLabel={<span className="hidden sm:inline">Logging out</span>}
              >
                <LogOutIcon />
                <span className="hidden sm:inline">Log out</span>
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>

      <AdminNav />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
