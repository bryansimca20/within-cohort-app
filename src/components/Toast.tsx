'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';

const DISMISS_MS = 2600;
const MESSAGES = { checkin: 'Check-in saved', session: 'Session logged' } as const;

/** Reads the `saved` query param the checkin/session save actions redirect with and renders the matching confirmation pill, keyed by `saved` so each new save gets a fresh dismiss timer. */
export function Toast() {
  const searchParams = useSearchParams();
  const saved = searchParams.get('saved');
  const message = saved === 'checkin' || saved === 'session' ? MESSAGES[saved] : null;

  if (!message) return null;

  return <ToastPill key={saved} message={message} />;
}

// Black confirmation pill for one save: auto-dismisses after ~2.6s and strips
// the `saved` param via router.replace so a later back/refresh won't re-show it.
function ToastPill({ message }: { message: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDismissed(true);
      router.replace(pathname);
    }, DISMISS_MS);
    return () => clearTimeout(timer);
  }, [pathname, router]);

  if (dismissed) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 flex justify-center px-4">
      <div className="animate-wi-toast-in flex max-w-[340px] items-center gap-2.5 whitespace-nowrap rounded-[10px] bg-wi-black px-[18px] py-3 text-sm font-semibold text-wi-paper shadow-[var(--wi-shadow-lg)]">
        <Check className="size-4" />
        {message}
      </div>
    </div>
  );
}
