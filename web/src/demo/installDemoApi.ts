/**
 * The GitHub Pages preview has no backend, so its build (VITE_DEMO_API=1) answers the API in the browser:
 * window.fetch is wrapped, and every request to API_BASE goes to the same MSW handlers the tests use, which
 * behave like the TechSphere API kit over the captured responses (docs/migration/observed). Nothing leaves the
 * browser; the data starts fresh on every page load. Normal builds never include this file (main.tsx loads it
 * only when VITE_DEMO_API is '1').
 */
import { getResponse } from 'msw';
import { API_BASE } from '../config';
import { handlers } from '../test/handlers';

export function installDemoApi(): void {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);
    if (!request.url.startsWith(API_BASE)) return realFetch(input, init);
    // A small delay, as a network would add, so loading states show as they do against the real API.
    await new Promise((resolve) => setTimeout(resolve, 120));
    const response = await getResponse(handlers, request);
    return (
      response ??
      Response.json(
        { error: 'Not found' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } },
      )
    );
  };
}
