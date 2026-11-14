import type { Meta, StoryObj } from '@storybook/react-vite';
import { forceState } from '../stories/states';
import { Button } from './Button';

const meta = {
  title: 'Core/Button',
  component: Button,
  args: { children: 'Add to cart', variant: 'primary', size: 'md' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Hover: Story = { decorators: [forceState('hover')] };
export const Focus: Story = { decorators: [forceState('focus')] };
export const Disabled: Story = { args: { disabled: true, children: 'Out of stock' } };
/** A destructive action uses the danger variant (buttons have no error state of their own). */
export const Error: Story = { args: { variant: 'danger', children: 'Empty the cart' } };
/** Spinner, aria-busy and aria-disabled; it stays focusable and ignores clicks. */
export const Loading: Story = { args: { loading: true, loadingLabel: 'Adding to cart' } };
export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-sm">
      <Button {...args} variant="primary">
        Primary
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
      <Button {...args} variant="danger">
        Danger
      </Button>
    </div>
  ),
};
