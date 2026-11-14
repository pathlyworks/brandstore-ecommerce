import type { Meta, StoryObj } from '@storybook/react-vite';
import { forceState, type StatesParameter } from '../stories/states';
import { Footer } from './Footer';

const states: StatesParameter = {
  notApplicable: {
    Disabled: 'Footer links are plain navigation and are never disabled.',
    Error: 'The footer is static content: no input, no request, nothing that can fail.',
    Loading: 'The footer is static content and renders at once.',
  },
};

const meta = {
  title: 'Core/Footer',
  component: Footer,
  args: {
    groups: [
      {
        title: 'Shop',
        links: [
          { to: '/products', label: 'All products' },
          { to: '/products?category=laptops', label: 'Laptops' },
        ],
      },
      {
        title: 'Your account',
        links: [
          { to: '/login', label: 'Sign in' },
          { to: '/account/orders', label: 'Orders' },
        ],
      },
      { title: 'Help', links: [{ to: '/compare', label: 'Compare products' }] },
    ],
    note: '© 2026 BrandStore.',
  },
  parameters: { layout: 'fullscreen', states },
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Hover: Story = { decorators: [forceState('hover')] };
export const Focus: Story = { decorators: [forceState('focus')] };
