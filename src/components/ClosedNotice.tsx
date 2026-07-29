import { Clock } from 'lucide-react';

/** The closed-window state for a capture screen (before the cohort starts, or after it completes): the screen title over a single calm centered message, so a gated page still reads as designed rather than a bare sentence. Sits under the shared logo header. */
export function ClosedNotice({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-[22px] pt-2 pb-28">
      <h1 className="text-h2 font-bold tracking-[-0.02em] text-wi-paper uppercase">{title}</h1>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <span className="flex size-12 items-center justify-center rounded-lg border border-wi-on-dark-line">
          <Clock className="size-5 text-wi-on-dark-2" />
        </span>
        <p className="max-w-[20rem] text-sm leading-relaxed text-wi-on-dark-2">{message}</p>
      </div>
    </div>
  );
}
