/**
 * Field measurement (Task 5): the web-vitals library reports Largest Contentful Paint (LCP), Interaction to
 * Next Paint (INP) and Cumulative Layout Shift (CLS) from real page loads and real interactions in the
 * browser that runs the app. Each report is logged to the console ("[web-vitals] LCP 812 ms good /products")
 * and kept in window.__webVitals, where web/scripts/field-vitals.mjs reads it on the deployed preview.
 * reportAllChanges: CLS and INP are logged each time they grow, not only when the page is hidden.
 * Task 7: each report also goes to the monitoring sink (src/app/monitoring.ts), which sends it with
 * navigator.sendBeacon when VITE_MONITORING_ENDPOINT is set (monitoring_plan.md).
 */
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import { record } from './monitoring';

export interface VitalReport {
  name: Metric['name'];
  value: number;
  rating: Metric['rating'];
  path: string;
  navigationType: Metric['navigationType'];
}

declare global {
  interface Window {
    __webVitals?: VitalReport[];
  }
}

function log(metric: Metric) {
  const report: VitalReport = {
    name: metric.name,
    value: metric.name === 'CLS' ? Number(metric.value.toFixed(3)) : Math.round(metric.value),
    rating: metric.rating,
    path: window.location.pathname,
    navigationType: metric.navigationType,
  };
  (window.__webVitals ??= []).push(report);
  record({ type: 'vital', name: report.name, value: report.value, rating: report.rating });
  console.info(
    `[web-vitals] ${report.name} ${report.value}${report.name === 'CLS' ? '' : ' ms'} ${report.rating} ${report.path}`,
  );
}

export function reportWebVitals(): void {
  onLCP(log, { reportAllChanges: true });
  onINP(log, { reportAllChanges: true });
  onCLS(log, { reportAllChanges: true });
}
