/**
 * The routing map of task_1_architecture.md §4 as route objects: one layout route (RootLayout renders
 * <Outlet />), the routes nested in it, a nested layout for /account (AccountLayout with its own <Outlet />,
 * index → /account/orders), and the catch-all 404. `handle.component` names the route module as the plan's
 * table does; routes.test.ts reads that table and fails if a path or a component name differs.
 */
import { Navigate, type RouteObject } from 'react-router';
import { RootLayout } from './RootLayout';
import { RouteError } from './RouteError';
import {
  AddressesRoute,
  AdminRoute,
  CheckoutRoute,
  CompareRoute,
  RegisterRoute,
} from './PlannedRoutes';
import { HomeRoute } from '../features/home/HomeRoute';
import { ProductsRoute } from '../features/catalog/ProductsRoute';
import { ProductRoute } from '../features/product/ProductRoute';
import { CartRoute } from '../features/cart/CartRoute';
import { LoginRoute } from '../features/auth/LoginRoute';
import { AccountLayout } from '../features/account/AccountLayout';
import { OrdersRoute } from '../features/account/OrdersRoute';
import { NotFoundRoute } from '../features/errors/NotFoundRoute';

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
      { path: 'checkout', element: <CheckoutRoute />, handle: { component: 'CheckoutRoute' } },
      { path: 'login', element: <LoginRoute />, handle: { component: 'LoginRoute' } },
      { path: 'register', element: <RegisterRoute />, handle: { component: 'RegisterRoute' } },
      {
        path: 'account',
        element: <AccountLayout />,
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
      { path: 'admin', element: <AdminRoute />, handle: { component: 'AdminRoute' } },
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
