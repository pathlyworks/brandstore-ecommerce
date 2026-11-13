/**
 * Shared values for the end-to-end specs. The API is the one given in VITE_API_BASE (grading), else the one
 * playwright.config.mjs starts on E2E_API_PORT.
 */
export const API_URL =
  process.env.VITE_API_BASE || `http://127.0.0.1:${process.env.E2E_API_PORT || 4011}`;

/** The TechSphere API kit's test account. */
export const ACCOUNT = {
  email: 'student@techsphere.test',
  password: 'Passw0rd!',
  name: 'Test Student',
};

/**
 * Put the API's data (orders, addresses, users) back to the start state before a test. The kit's server
 * has POST /__reset only when started with --grader (as playwright.config.mjs does); an API given in
 * VITE_API_BASE may not have it, and then the tests run on its data as it is (they only read it).
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function resetApi(request) {
  const response = await request.post(`${API_URL}/__reset`).catch(() => null);
  if (response && !response.ok() && response.status() !== 404) {
    throw new Error(`POST /__reset answered ${response.status()}`);
  }
}
