/** App-wide state, limited to what the state matrix (task_1_architecture.md §5) puts in Context. */
import type { ReactNode } from 'react';
import { AuthProvider } from '../state/AuthContext';
import { CartProvider } from '../state/CartContext';
import { ToastProvider } from '../components/Toast';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>{children}</ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}
