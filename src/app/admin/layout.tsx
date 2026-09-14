import type { ReactNode } from 'react';
import Link from 'next/link';
import { LogOutIcon } from 'lucide-react';
import { logout } from '@/app/login/actions';
import { AdminNav } from './AdminNav';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Chrome for every founder/admin route: a header (wordmark + back-to-runner
// + logout) and the tab row for the dashboard, member management, and the two
// raw CSV exports. The tab row is split into AdminNav because marking the
// active tab needs the current pathname, which is client-only; this layout
// stays a server component. The layout itself never writes data;
// /admin/members is the one child route that does (roster + passcode
// management), gated by its own requireAdmin() call.
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

      <AdminNav />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
