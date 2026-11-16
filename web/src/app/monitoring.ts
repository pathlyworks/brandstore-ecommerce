/**
 * Monitoring hooks (Task 7, monitoring_plan.md). One small, vendor-neutral sink for three kinds of event:
 *
 * - **errors**: uncaught errors, unhandled promise rejections and errors that reach the route error element;
 * - **Web Vitals**: LCP, INP and CLS from real page loads (src/app/vitals.ts sends them here);
 * - **funnel events**: the checkout steps, named now so a backend can count them later.
 *
 * Today there is no backend and no analytics account, so every event is kept in the page (`window.__monitoring`,
 * the last 100) where tests and the field-vitals script read it. When VITE_MONITORING_ENDPOINT is set, each event
 * is also sent with `navigator.sendBeacon` (survives page unload, never blocks the UI). Swapping in an
 * error-tracking service (Sentry, Datadog RUM...) means replacing `send()` and nothing else.
 *
 * Privacy: events carry the path (never the query string, which can hold search terms), the release and the
 * event's own fields. No token, address, phone or card detail is ever put in an event.
 */

export const FUNNEL_EVENTS = [
  'view_item',
  'add_to_cart',
  'begin_checkout',
  'add_shipping_info',
  'add_payment_info',
  'purchase',
  'purchase_failed',
] as const;
export type FunnelEventName = (typeof FUNNEL_EVENTS)[number];

export type ErrorSource = 'window' | 'unhandledrejection' | 'route';

interface Base {
  path: string;
  release: string;
  time: string;
}

export type MonitoringEvent =
  | (Base & { type: 'error'; source: ErrorSource; message: string; stack?: string })
  | (Base & {
      type: 'vital';
      name: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';
      value: number;
      rating: string;
    })
  | (Base & { type: 'funnel'; name: FunnelEventName; props: Record<string, string | number> });

type Payload =
  | { type: 'error'; source: ErrorSource; message: string; stack?: string }
  | { type: 'vital'; name: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB'; value: number; rating: string }
  | { type: 'funnel'; name: FunnelEventName; props: Record<string, string | number> };

declare global {
  interface Window {
    __monitoring?: MonitoringEvent[];
  }
}

const KEEP = 100;
const release = import.meta.env.VITE_RELEASE ?? 'dev';

function send(event: MonitoringEvent): void {
  const endpoint = import.meta.env.VITE_MONITORING_ENDPOINT;
  if (!endpoint || typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function')
    return;
  try {
    navigator.sendBeacon(endpoint, new Blob([JSON.stringify(event)], { type: 'application/json' }));
  } catch {
    // Monitoring must never break the shop.
  }
}

/** Records one event: kept in the page, and sent when an endpoint is configured. */
export function record(payload: Payload): MonitoringEvent {
  const event = {
    ...payload,
    path: typeof window === 'undefined' ? '' : window.location.pathname,
    release,
    time: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    const list = (window.__monitoring ??= []);
    list.push(event);
    if (list.length > KEEP) list.splice(0, list.length - KEEP);
  }
  send(event);
  return event;
}

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message.slice(0, 500),
      ...(error.stack ? { stack: error.stack.slice(0, 2000) } : {}),
    };
  }
  return { message: String(error).slice(0, 500) };
}

/** An error the app caught but wants counted (the route error element calls this). */
export function captureError(error: unknown, source: ErrorSource): MonitoringEvent {
  return record({ type: 'error', source, ...describe(error) });
}

/** A checkout funnel step. Properties are counts and amounts only, never personal data. */
export function track(
  name: FunnelEventName,
  props: Record<string, string | number> = {},
): MonitoringEvent {
  return record({ type: 'funnel', name, props });
}

let installed = false;

/** Uncaught errors and unhandled rejections, for the whole page. Safe to call more than once. */
export function installErrorTracking(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (e: ErrorEvent) => {
    captureError(e.error ?? e.message, 'window');
  });
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    captureError(e.reason, 'unhandledrejection');
  });
}
