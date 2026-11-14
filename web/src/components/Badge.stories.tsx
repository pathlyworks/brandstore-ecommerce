import type { Meta, StoryObj } from '@storybook/react-vite';
import type { StatesParameter } from '../stories/states';
import { Badge } from './Badge';

const states: StatesParameter = {
  notApplicable: {
    Hover:
      'A badge is a label, not a control: nothing happens on hover, so there is no hover style.',
    Focus: 'A badge is never focusable (it is read with the text around it).',
  },
};

const meta = {
  title: 'Core/Badge',
  component: Badge,
  args: { children: 'In stock', tone: 'success' },
  argTypes: {
    tone: { control: 'inline-radio', options: ['neutral', 'info', 'success', 'warning', 'danger'] },
  },
  parameters: { states },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** `muted`: the status no longer applies (a cancelled order). */
export const Disabled: Story = { args: { tone: 'neutral', muted: true, children: 'Cancelled' } };
export const Error: Story = { args: { tone: 'danger', children: 'Out of stock' } };
/** Same size as the badge, so nothing moves when the value arrives. */
export const Loading: Story = { args: { loading: true } };
export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-xs">
      <Badge tone="neutral">Stock unknown</Badge>
      <Badge tone="info">Processing</Badge>
      <Badge tone="success">In stock</Badge>
      <Badge tone="warning">Low stock</Badge>
      <Badge tone="danger">Out of stock</Badge>
    </div>
  ),
};
