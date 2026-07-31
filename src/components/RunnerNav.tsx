'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ActivityIcon, ClockIcon, HomeIcon, SunriseIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { href: '/today', label: 'Today', icon: HomeIcon },
  { href: '/checkin', label: 'Check-in', icon: SunriseIcon },
  { href: '/session', label: 'Session', icon: ActivityIcon },
  { href: '/history', label: 'History', icon: ClockIcon },
];

/** Fixed black bottom nav for the four runner tabs, highlighting the active route. */
export function RunnerNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 bg-wi-black border-t border-wi-on-dark-line pb-[env(safe-area-inset-bottom)] md:absolute md:pb-0">
      <div className="mx-auto flex max-w-md">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-2xs font-bold uppercase tracking-[0.06em] transition-transform duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.94]',
                active ? 'text-wi-paper' : 'text-wi-on-dark-3'
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
