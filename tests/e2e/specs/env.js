/** Shared values for the end-to-end specs. The port is the one playwright.config.mjs starts the API on. */
export const API_URL = `http://127.0.0.1:${process.env.E2E_API_PORT || 4011}`;

/** The TechSphere API kit's test account. */
export const ACCOUNT = {
  email: 'student@techsphere.test',
  password: 'Passw0rd!',
  name: 'Test Student',
};

/**
 * Put the API's data (orders, addresses, users) back to the start state before a test.
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function resetApi(request) {
  const response = await request.post(`${API_URL}/__reset`);
  if (!response.ok()) throw new Error(`POST /__reset answered ${response.status()}`);
}
