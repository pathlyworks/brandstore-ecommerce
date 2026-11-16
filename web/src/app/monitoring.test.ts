import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureError, FUNNEL_EVENTS, installErrorTracking, record, track } from './monitoring';

describe('monitoring sink (monitoring_plan.md)', () => {
  beforeEach(() => {
    window.__monitoring = [];
    window.history.replaceState(null, '', '/checkout/review?q=private+search');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    window.history.replaceState(null, '', '/');
  });

  it('keeps each event in the page with the path, never the query string', () => {
    const event = track('purchase', { items: 2, total: 259800, currency: 'EGP' });
    expect(event).toMatchObject({ type: 'funnel', name: 'purchase', path: '/checkout/review' });
    expect(JSON.stringify(window.__monitoring)).not.toContain('private');
  });

  it('keeps only the last 100 events', () => {
    for (let i = 0; i < 130; i += 1)
      record({ type: 'vital', name: 'CLS', value: i, rating: 'good' });
    expect(window.__monitoring).toHaveLength(100);
    expect(window.__monitoring?.[0]).toMatchObject({ value: 30 });
  });

  it('sends nothing without an endpoint, and a beacon when one is configured', () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    captureError(new Error('first'), 'route');
    expect(beacon).not.toHaveBeenCalled();

    vi.stubEnv('VITE_MONITORING_ENDPOINT', 'https://monitoring.example/ingest');
    captureError(new Error('boom'), 'route');
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0]?.[0]).toBe('https://monitoring.example/ingest');
  });

  it('never breaks the page when the beacon throws', () => {
    vi.stubEnv('VITE_MONITORING_ENDPOINT', 'https://monitoring.example/ingest');
    Object.defineProperty(navigator, 'sendBeacon', {
      value: () => {
        throw new Error('blocked');
      },
      configurable: true,
    });
    expect(() => track('add_to_cart', { productId: 'p-001', quantity: 1 })).not.toThrow();
  });

  it('records uncaught errors and unhandled rejections once installed', () => {
    installErrorTracking();
    installErrorTracking(); // a second call adds no second listener
    window.dispatchEvent(
      new ErrorEvent('error', { error: new Error('uncaught'), message: 'uncaught' }),
    );
    const rejection = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(rejection, 'reason', { value: new Error('rejected') });
    window.dispatchEvent(rejection);
    const errors = (window.__monitoring ?? []).filter((e) => e.type === 'error');
    expect(errors.map((e) => (e.type === 'error' ? [e.source, e.message] : []))).toEqual([
      ['window', 'uncaught'],
      ['unhandledrejection', 'rejected'],
    ]);
  });

  it('names the checkout funnel in order, from product to purchase', () => {
    expect(FUNNEL_EVENTS).toEqual([
      'view_item',
      'add_to_cart',
      'begin_checkout',
      'add_shipping_info',
      'add_payment_info',
      'purchase',
      'purchase_failed',
    ]);
  });
});
