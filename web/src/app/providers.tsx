/**
 * App-wide state, kept to what the state-strategy matrix (task_1_architecture.md §5) puts in Context.
 * Wave 0 has the cart; AuthProvider (wave 3) and Announcer (wave 1) join here.
 */
import type { ReactNode } from 'react';
import { CartProvider } from '../features/cart/CartContext';

export function Providers({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
