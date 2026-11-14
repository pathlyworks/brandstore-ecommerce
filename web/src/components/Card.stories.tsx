import type { Meta, StoryObj } from '@storybook/react-vite';
import { forceState } from '../stories/states';
import { Badge } from './Badge';
import { Card } from './Card';

const meta = {
  title: 'Core/Card',
  component: Card,
  args: {
    heading: 'Nova Laptops 1',
    href: '/products/p-001',
    media: (
      <img
        src="/product-placeholder.svg"
        alt="Nova Laptops 1"
        width={320}
        height={240}
        className="aspect-(--ratio-media) w-full object-cover"
      />
    ),
    children: <p className="text-sm text-text-muted">Nova · 3 of 5 (10 reviews)</p>,
    footer: (
      <div className="flex items-center justify-between">
        <strong>EGP 32,999.00</strong>
        <Badge tone="success">In stock</Badge>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div className="max-w-(--size-sidebar)">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The whole card is one link (its heading), so it is one tab stop. */
export const Default: Story = {};
export const Hover: Story = { decorators: [forceState('hover')] };
export const Focus: Story = { decorators: [forceState('focus')] };
/** aria-disabled, e.g. out of stock: still a link to the product page, visibly unavailable. */
export const Disabled: Story = {
  args: {
    disabled: true,
    footer: (
      <div className="flex items-center justify-between">
        <strong>EGP 32,999.00</strong>
        <Badge tone="danger">Out of stock</Badge>
      </div>
    ),
  },
};
export const Error: Story = {
  args: {
    tone: 'danger',
    href: undefined,
    heading: 'Could not load this product',
    media: undefined,
    footer: undefined,
    children: <p className="text-sm text-text">The store did not answer. Try again in a moment.</p>,
  },
};
/** A skeleton of the same size (aria-hidden; the page announces "Loading products"). */
export const Loading: Story = { args: { loading: true } };
