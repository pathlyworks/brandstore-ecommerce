import type { Meta, StoryObj } from '@storybook/react-vite';
import { forceState, type StatesParameter } from '../stories/states';
import { Steps, type StepItem } from './Steps';

type Step = 'address' | 'payment' | 'review';

const at = (
  current: Step,
  extra: Partial<Record<Step, Partial<StepItem<Step>>>> = {},
): StepItem<Step>[] => {
  const order: Step[] = ['address', 'payment', 'review'];
  const labels: Record<Step, string> = {
    address: 'Delivery address',
    payment: 'Payment method',
    review: 'Review',
  };
  return order.map((id, i) => ({
    id,
    label: labels[id],
    to: `/checkout/${id}`,
    state: i < order.indexOf(current) ? 'complete' : id === current ? 'current' : 'upcoming',
    locked: i > order.indexOf(current),
    ...extra[id],
  }));
};

const states: StatesParameter = {};

const meta = {
  title: 'Core/Steps',
  component: Steps<Step>,
  args: { label: 'Checkout progress', steps: at('payment') },
  parameters: { states },
} satisfies Meta<typeof Steps<Step>>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Step 2 current; step 1 completed (a link back); step 3 locked until step 2 is valid. */
export const Default: Story = {};
export const Hover: Story = { decorators: [forceState('hover')] };
export const Focus: Story = { decorators: [forceState('focus')] };
/** Locked steps are text with aria-disabled, not links: they cannot be skipped to. */
export const Disabled: Story = { args: { steps: at('address') } };
/** A step whose data is no longer valid (e.g. the address was cleared in another tab). */
export const Error: Story = { args: { steps: at('review', { address: { state: 'error' } }) } };
export const Loading: Story = { args: { loading: true } };
export const Completed: Story = {
  args: {
    steps: at('review').map((s) => (s.id === 'review' ? s : { ...s, state: 'complete' as const })),
  },
};
