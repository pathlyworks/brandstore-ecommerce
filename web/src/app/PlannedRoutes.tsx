/** Routes of the map that later waves migrate (task_1_architecture.md §9). Named as in the plan's §4 table. */
import { Planned } from './Planned';

export function AddressesRoute() {
  return <Planned title="Your addresses" wave={3} legacy="account.html" />;
}
export function CompareRoute() {
  return <Planned title="Compare products" wave={5} legacy="comparison.html" />;
}
