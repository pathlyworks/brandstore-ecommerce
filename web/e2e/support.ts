/** Shared steps for the web specs: the API address, a data reset where the API allows it, sign-in. */
import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const API_URL =
  process.env.VITE_API_BASE || `http://127.0.0.1:${process.env.E2E_API_PORT || 4011}`;
export const ACCOUNT = { email: 'student@techsphere.test', password: 'Passw0rd!' };

/** POST /__reset exists on the kit started with --grader; an API given in VITE_API_BASE may not have it. */
export async function resetApi(request: APIRequestContext): Promise<void> {
  await request.post(`${API_URL}/__reset`).catch(() => null);
}

export async function signIn(page: Page, next = '/account/orders'): Promise<void> {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email').fill(ACCOUNT.email);
  await page.getByLabel('Password').fill(ACCOUNT.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[/?]/g, '\\$&')}$`));
}
