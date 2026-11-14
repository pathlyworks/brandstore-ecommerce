/** App-wide state, limited to what the state matrix (task_1_architecture.md §5) puts in Context. */
import type { ReactNode } from 'react';
import { AuthProvider } from '../features/auth/AuthContext';
import { CartProvider } from '../features/cart/CartContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  );
}
