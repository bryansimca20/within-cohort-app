'use client';

import { useSyncExternalStore } from 'react';
import { Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const DISMISS_KEY = 'within-install-dismissed';

// iOS Safari predates the standard `BeforeInstallPromptEvent` and flags a
// running home-screen app via `navigator.standalone`, a non-standard field
// missing from the DOM lib typings.
type IOSNavigator = Navigator & { standalone?: boolean };

function isStandalone(): boolean {
  const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = (window.navigator as IOSNavigator).standalone === true;
  return isStandaloneDisplay || isIOSStandalone;
}

// Local pub-sub so `dismiss()` can notify `useSyncExternalStore` without a
// setState-in-effect: reading matchMedia/localStorage is a browser-only
// external system, and the sync hook is the React-endorsed way to read one
// without a server/client hydration mismatch (server snapshot is `false`).
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): boolean {
  const alreadyDismissed = window.localStorage.getItem(DISMISS_KEY) === '1';
  return !alreadyDismissed && !isStandalone();
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Dismissible "Add to Home Screen" prompt for iOS Safari. Hidden once the
 * app is already running standalone or once the runner dismisses it
 * (dismissal persists in localStorage, so it stays hidden across sessions).
 */
export function InstallCard() {
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, '1');
    notifyListeners();
  }

  if (!visible) return null;

  // Rendered only on the black Today screen (see today/page.tsx), so the
  // default light-card styling is overridden here to the on-dark tokens
  // instead of being made a light card floating on black.
  return (
    <Card size="sm" className="border-wi-on-dark-line bg-wi-on-dark-fill">
      <CardContent className="flex items-center gap-3">
        <Share className="size-4 shrink-0 text-wi-on-dark-2" />
        <p className="flex-1 text-sm text-wi-on-dark-2">
          Tap <span className="font-medium text-wi-paper">Share</span>, then{' '}
          <span className="font-medium text-wi-paper">Add to Home Screen</span>.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss install prompt"
          onClick={dismiss}
          className="text-wi-on-dark-2 hover:bg-wi-on-dark-fill hover:text-wi-paper"
        >
          <X />
        </Button>
      </CardContent>
    </Card>
  );
}
