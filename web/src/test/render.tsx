/** Render the real routing map at a URL, inside the app's providers (as main.tsx does). */
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { Providers } from '../app/providers';
import { routes } from '../app/routes';

export function renderApp(url = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  const view = render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
  return { ...view, router };
}
