/**
 * Shown while the browser is offline: the page the service worker served may be an older copy, so prices
 * and stock can be out of date, and orders cannot be placed until the connection is back.
 */
import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <p
      role="status"
      className="bg-accent-soft px-md py-xs text-center text-sm font-semibold text-text"
    >
      You are offline. You are seeing the last saved copy: prices and stock may have changed, and
      orders can be placed once you are back online.
    </p>
  );
}
