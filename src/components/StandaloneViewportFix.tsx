'use client';

import { useEffect } from 'react';

/**
 * Works around an iOS home-screen (standalone) PWA quirk: `viewport-fit=cover`
 * is not applied on the very first paint, so the layout viewport starts ~34px
 * short (it excludes the home-indicator band) and the fixed bottom nav renders
 * raised until the first navigation reflows the page and iOS finally applies
 * cover. Toggling the viewport meta's `viewport-fit` off then back on right
 * after mount forces that recompute immediately, so the nav starts at the true
 * bottom edge. Off iOS (or where the tag has no `viewport-fit=cover`) the
 * restore is a no-op, so this is safe everywhere.
 */
export function StandaloneViewportFix() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;

    const original = meta.getAttribute('content') ?? '';
    if (!original.includes('viewport-fit=cover')) return;

    // Drop viewport-fit this frame, restore it next frame. The off→on flip is
    // what makes iOS re-evaluate the safe-area insets and apply cover.
    meta.setAttribute('content', original.replace(/,?\s*viewport-fit=cover/, ''));
    const id = requestAnimationFrame(() => {
      meta.setAttribute('content', original);
    });

    return () => cancelAnimationFrame(id);
  }, []);

  return null;
}
