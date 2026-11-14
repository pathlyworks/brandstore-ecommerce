/**
 * The routing map of task_1_architecture.md §4 as route objects: one layout route (RootLayout renders
 * <Outlet />), the routes nested in it, a nested layout for /account (AccountLayout with its own <Outlet />,
 * index → /account/orders), and the catch-all 404. `handle.component` names the route module as the plan's
 * table does; routes.test.ts reads that table and fails if a path or a component name differs.
 *
 * Access (task_4_security.md): /checkout and /account need a valid session, /admin the admin role. The guard
 * (ProtectedRoute) is in this eagerly loaded file and wraps the lazily loaded screens, so a guarded screen's
 * code is fetched only once the guard lets the user through.
 *
 * Code splitting: the admin area and the checkout steps are separate chunks (React.lazy; RootLayout's
 * <Suspense> shows a loading state while one downloads). A shopper never downloads the admin chunk.
 */
import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { RegisterRoute } from '../features/auth/RegisterRoute';
import { RootLayout } from './RootLayout';
import { RouteError } from './RouteError';
import { AddressesRoute, CompareRoute } from './PlannedRoutes';
import { HomeRoute } from '../features/home/HomeRoute';
import { ProductsRoute } from '../features/catalog/ProductsRoute';
import { ProductRoute } from '../features/product/ProductRoute';
import { CartRoute } from '../features/cart/CartRoute';
import { LoginRoute } from '../features/auth/LoginRoute';
import { AccountLayout } from '../features/account/AccountLayout';
import { OrdersRoute } from '../features/account/OrdersRoute';
import { ConfirmationRoute } from '../features/checkout/ConfirmationRoute';
import { NotFoundRoute } from '../features/errors/NotFoundRoute';

const AdminRoute = lazy(() => import('../features/admin/AdminRoute'));
const CheckoutLayout = lazy(() =>
  import('../features/checkout/CheckoutLayout').then((m) => ({ default: m.CheckoutLayout })),
);
const CheckoutIndex = lazy(() =>
  import('../features/checkout/CheckoutIndex').then((m) => ({ default: m.CheckoutIndex })),
);
const AddressStep = lazy(() =>
  import('../features/checkout/AddressStep').then((m) => ({ default: m.AddressStep })),
);
const PaymentStep = lazy(() =>
  import('../features/checkout/PaymentStep').then((m) => ({ default: m.PaymentStep })),
);
const ReviewStep = lazy(() =>
  import('../features/checkout/ReviewStep').then((m) => ({ default: m.ReviewStep })),
);

export interface RouteHandle {
  component: string;
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomeRoute />, handle: { component: 'HomeRoute' } },
      { path: 'products', element: <ProductsRoute />, handle: { component: 'ProductsRoute' } },
      { path: 'products/:id', element: <ProductRoute />, handle: { component: 'ProductRoute' } },
      { path: 'cart', element: <CartRoute />, handle: { component: 'CartRoute' } },
      {
        path: 'checkout',
        element: (
          <ProtectedRoute>
            <CheckoutLayout />
          </ProtectedRoute>
        ),
        handle: { component: 'CheckoutLayout' },
        children: [
          { index: true, element: <CheckoutIndex /> },
          { path: 'address', element: <AddressStep />, handle: { component: 'AddressStep' } },
          { path: 'payment', element: <PaymentStep />, handle: { component: 'PaymentStep' } },
          { path: 'review', element: <ReviewStep />, handle: { component: 'ReviewStep' } },
        ],
      },
      {
        path: 'checkout/confirmation/:number',
        element: <ConfirmationRoute />,
        handle: { component: 'ConfirmationRoute' },
      },
      { path: 'login', element: <LoginRoute />, handle: { component: 'LoginRoute' } },
      { path: 'register', element: <RegisterRoute />, handle: { component: 'RegisterRoute' } },
      {
        path: 'account',
        element: (
          <ProtectedRoute>
            <AccountLayout />
          </ProtectedRoute>
        ),
        handle: { component: 'AccountLayout' },
        children: [
          { index: true, element: <Navigate to="/account/orders" replace /> },
          { path: 'orders', element: <OrdersRoute />, handle: { component: 'OrdersRoute' } },
          {
            path: 'addresses',
            element: <AddressesRoute />,
            handle: { component: 'AddressesRoute' },
          },
        ],
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute role="admin">
            <AdminRoute />
          </ProtectedRoute>
        ),
        handle: { component: 'AdminRoute' },
      },
      { path: 'compare', element: <CompareRoute />, handle: { component: 'CompareRoute' } },
      { path: '*', element: <NotFoundRoute />, handle: { component: 'NotFoundRoute' } },
    ],
  },
];

function join(parent: string, path: string): string {
  if (path === '*' && parent === '/') return '*';
  return `${parent.replace(/\/$/, '')}/${path}`;
}

/** Each named route as { path, component }, with full paths ("/account/orders"). */
export function routeMap(
  list: readonly RouteObject[] = routes,
  parent = '',
): { path: string; component: string }[] {
  return list.flatMap((route) => {
    const path = route.index
      ? parent || '/'
      : route.path === '/'
        ? '/'
        : join(parent || '/', route.path ?? '');
    const handle = route.handle as RouteHandle | undefined;
    const own = handle ? [{ path, component: handle.component }] : [];
    return [...own, ...(route.children ? routeMap(route.children, path) : [])];
  });
}
