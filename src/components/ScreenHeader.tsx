import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

/** Full-bleed black header bar for a runner screen: optional back link, uppercase title, optional right slot and sub line. */
export function ScreenHeader({
  title,
  sub,
  backHref,
  right,
}: {
  title: string;
  sub?: string;
  backHref?: string;
  right?: ReactNode;
}) {
  return (
    <header className="bg-wi-black text-wi-paper px-[22px] pt-4 pb-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {backHref ? (
            <Link href={backHref} aria-label="Back" className="text-wi-paper">
              <ArrowLeftIcon className="size-5" />
            </Link>
          ) : null}
          <h1 className="text-h3 font-bold uppercase tracking-[-0.02em]">{title}</h1>
        </div>
        {right}
      </div>
      {sub ? <p className="text-xs text-wi-on-dark-2">{sub}</p> : null}
    </header>
  );
}
