/** Entry point: one HTML shell, the router and the app-wide providers (task_1_architecture.md §3). */
import { Profiler, StrictMode, type ProfilerOnRenderCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/router';
import { Providers } from './app/providers';
import { reportWebVitals } from './app/vitals';
import { installErrorTracking } from './app/monitoring';
import { registerServiceWorker } from './app/serviceWorker';
import './styles/index.css';

installErrorTracking();

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root element');

const app = (
  <Providers>
    <RouterProvider router={router} />
  </Providers>
);

// Profiling builds only (VITE_PROFILE=1): every commit's render time, read by web/scripts/profile.mjs.
const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration) => {
  const w = window as Window & { __profile?: object[] };
  (w.__profile ??= []).push({ id, phase, actualDuration, baseDuration, path: location.pathname });
};

function start(container: HTMLElement) {
  createRoot(container).render(
    <StrictMode>
      {import.meta.env.VITE_PROFILE === '1' ? (
        <Profiler id="app" onRender={onRender}>
          {app}
        </Profiler>
      ) : (
        app
      )}
    </StrictMode>,
  );
}

// The GitHub Pages preview (VITE_DEMO_API=1) answers the API in the browser; other builds leave this out.
if (import.meta.env.VITE_DEMO_API === '1') {
  void import('./demo/installDemoApi').then(({ installDemoApi }) => {
    installDemoApi();
    start(root);
  });
} else {
  start(root);
}

reportWebVitals();
registerServiceWorker();
