/** Loads one test file (?file=/tests/dom/x.test.js), runs it and leaves the results on window. */
import { run } from 'vitest';
import { unhandled } from 'msw';

window.__unmockedFetch = window.fetch.bind(window);
const file = new URL(location.href).searchParams.get('file');
try {
  await import(file);
  const results = await run();
  window.__report = { results, unhandled };
} catch (error) {
  window.__report = {
    results: [{ name: file, ok: false, error: String(error?.stack || error) }],
    unhandled,
  };
}
