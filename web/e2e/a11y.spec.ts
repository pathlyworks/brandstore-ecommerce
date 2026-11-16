/**
 * axe-core in the end-to-end suite (Task 6): every key route, in the real browser against the TechSphere API,
 * signed out, as a shopper (cart, checkout, orders) and as the admin (dashboard). WCAG 2.0/2.1 A and AA rules;
 * the test fails on any serious or critical violation and lists the others in its output.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, resetApi, signIn } from './support';

const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[] }[];
}

async function axeRun(page: Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: { run: (ctx: Document, opts: object) => Promise<{ violations: AxeViolation[] }> };
      }
    ).axe;
    const result = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return result.violations;
  });
}

async function expectNoSeriousViolations(page: Page, route: string) {
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  const violations = await axeRun(page);
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = violations.map(
    (v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes[0]?.target.join(' ')})`,
  );
  if (report.length) console.log(`axe ${route}:\n  ${report.join('\n  ')}`);
  expect(blocking, `${route}: serious or critical axe violations`).toEqual([]);
}

test.beforeEach(async ({ request }) => resetApi(request));

for (const route of ['/', '/products', '/products/p-001', '/cart', '/login', '/register']) {
  test(`axe: ${route} (signed out) has no serious or critical violations`, async ({ page }) => {
    await page.goto(route);
    await expectNoSeriousViolations(page, route);
  });
}

test('axe: cart, checkout steps and orders (shopper)', async ({ page }) => {
  await signIn(page, '/products/p-003');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  for (const route of ['/cart', '/checkout/address', '/account/orders']) {
    await page.goto(route);
    await expectNoSeriousViolations(page, route);
  }
  // The address step with its error summary showing.
  await page.goto('/checkout/address');
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expectNoSeriousViolations(page, '/checkout/address (errors)');
});

test('axe: the admin dashboard (admin)', async ({ page }) => {
  await signIn(page, '/admin', ADMIN);
  await expect(
    page.getByRole('table', { name: 'Every order, cancelled ones included' }),
  ).toBeVisible();
  await expectNoSeriousViolations(page, '/admin');
});
