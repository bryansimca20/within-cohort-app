'use client';

import { useEffect } from 'react';

/**
 * Registers the app-shell service worker (public/sw.js) on mount so it can
 * cache /today for offline opens and handle Web Push. Guarded by feature
 * detection and fails quietly: an unsupported browser or a failed
 * registration must never break the app.
 */
export function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return null;
}
