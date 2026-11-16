/** Registers public/sw.js (caching rules and versions are documented there and in the Task 5 report). */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL;
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => undefined);
  });
}
