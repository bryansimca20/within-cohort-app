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

/** Black bottom nav for the four runner tabs, highlighting the active route. In-flow (the app shell's last
 *  child), not fixed: placed by document layout rather than the visual viewport, it sits at the true bottom
 *  from the first paint on iOS standalone (where a fixed bar renders raised until the first navigation). The
 *  labels sit flush to the bottom edge by intent (no safe-area inset), so on a home-indicator device they
 *  share that band with the gesture bar. */
export function RunnerNav() {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 bg-wi-black border-t border-wi-on-dark-line">
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
