/**
 * The routing map of task_1_architecture.md §4 as route objects: one layout route (RootLayout with <Outlet />),
 * the routes nested in it, and a catch-all 404. Each route shows which wave migrates it; the legacy pages serve
 * those URLs until then (Netlify redirects move them one at a time).
 */
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { RootLayout } from './RootLayout';
import { Planned } from './Planned';
import { NotFoundRoute } from '../features/errors/NotFoundRoute';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Planned title="Home" wave={1} legacy="index.html" /> },
      { path: 'products', element: <Planned title="Products" wave={1} legacy="catalog.html" /> },
      {
        path: 'products/:id',
        element: <Planned title="Product" wave={1} legacy="product.html?id=" />,
      },
      { path: 'cart', element: <Planned title="Cart" wave={2} legacy="cart.html" /> },
      {
        path: 'checkout',
        element: <Planned title="Checkout" wave={4} legacy="cart.html (Place order)" />,
      },
      { path: 'login', element: <Planned title="Sign in" wave={3} legacy="login.html" /> },
      {
        path: 'register',
        element: <Planned title="Create an account" wave={3} legacy="register.html" />,
      },
      { path: 'account', element: <Navigate to="/account/orders" replace /> },
      {
        path: 'account/orders',
        element: <Planned title="Your orders" wave={3} legacy="account.html" />,
      },
      {
        path: 'account/addresses',
        element: <Planned title="Your addresses" wave={3} legacy="account.html" />,
      },
      { path: 'admin', element: <Planned title="Admin summary" wave={4} legacy="(new)" /> },
      { path: 'compare', element: <Planned title="Compare" wave={5} legacy="comparison.html" /> },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
