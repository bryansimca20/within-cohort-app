'use client';

import { useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
 * a network error must never break the page.
 */
export function EnablePush() {
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

  // Rendered only on the black Today screen (see today/page.tsx). The
  // `secondary` variant's black-on-transparent styling is invisible there,
  // so both states override border/text to the on-dark tokens.
  if (state === 'on') {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled
        className="w-full border-wi-on-dark-3 text-wi-paper disabled:opacity-60"
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
      className="w-full border-wi-on-dark-3 text-wi-paper hover:bg-wi-on-dark-fill hover:text-wi-paper"
    >
      <Bell />
      Turn on reminders
    </Button>
  );
}
