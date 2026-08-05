'use client';

import { useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PushState = 'checking' | 'unsupported' | 'blocked' | 'off' | 'on';

// Standard VAPID-key transform: the applicationServerKey the Push API needs
// is a raw Uint8Array, but env vars/URLs carry it as URL-safe base64.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * "Turn on reminders" button: requests notification permission, subscribes
 * to Web Push via the installed service worker, and posts the subscription
 * to /api/push/subscribe. Renders nothing when the browser lacks Push
 * support or has permanently blocked notifications, and reflects "Reminders
 * on" once already subscribed. Every failure is silent - a denied prompt or
 * a network error must never break the page. `tone` picks the palette: `dark`
 * (default) for the black Today/History screens, `light` for the admin card.
 * `showWhenOn` (default true) keeps the "Reminders on" confirmation visible;
 * pass false on the fixed, non-scrolling Today screen so the control is a pure
 * nudge that vanishes once granted, costing no permanent layout there.
 */
export function EnablePush({
  tone = 'dark',
  showWhenOn = true,
}: { tone?: 'dark' | 'light'; showWhenOn?: boolean } = {}) {
  const [state, setState] = useState<PushState>('checking');

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (!cancelled) setState('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        if (!cancelled) setState('blocked');
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (!cancelled) setState(existing && Notification.permission === 'granted' ? 'on' : 'off');
      } catch {
        if (!cancelled) setState('off');
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'off');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      setState('on');
    } catch {
      // Permission prompts can be dismissed, subscribe() can fail, the
      // network can be down: leave the button as-is so the runner can retry.
    }
  }

  if (state === 'checking' || state === 'unsupported' || state === 'blocked') return null;

  // On dark screens (Today/History) the `secondary` variant's black-on-
  // transparent styling is invisible, so border/text are overridden to the
  // on-dark tokens and the button spans full width. On the light admin card
  // the default secondary styling already reads, so it keeps its intrinsic
  // width and no overrides.
  const dark = tone === 'dark';
  if (state === 'on' && !showWhenOn) return null;
  if (state === 'on') {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled
        className={cn('disabled:opacity-60', dark && 'w-full border-wi-on-dark-3 text-wi-paper')}
      >
        <BellRing />
        Reminders on
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={enable}
      className={cn(dark && 'w-full border-wi-on-dark-3 text-wi-paper hover:bg-wi-on-dark-fill hover:text-wi-paper')}
    >
      <Bell />
      Turn on reminders
    </Button>
  );
}
