/** /checkout: open the first step that still needs input (or the review when everything is complete). */
import { Navigate } from 'react-router';
import { useCheckout } from './CheckoutContext';
import { firstIncompleteStep } from './checkout.model';

export function CheckoutIndex() {
  const { draft } = useCheckout();
  return <Navigate to={`/checkout/${firstIncompleteStep(draft)}`} replace />;
}
