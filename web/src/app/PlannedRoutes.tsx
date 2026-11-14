/** Routes of the map that later waves migrate (task_1_architecture.md §9). Named as in the plan's §4 table. */
import { Planned } from './Planned';

export function CheckoutRoute() {
  return <Planned title="Checkout" wave={4} legacy="cart.html, Place order" />;
}
export function RegisterRoute() {
  return <Planned title="Create an account" wave={3} legacy="register.html" />;
}
export function AddressesRoute() {
  return <Planned title="Your addresses" wave={3} legacy="account.html" />;
}
export function AdminRoute() {
  return <Planned title="Admin summary" wave={4} legacy="new in React" />;
}
export function CompareRoute() {
  return <Planned title="Compare products" wave={5} legacy="comparison.html" />;
}
