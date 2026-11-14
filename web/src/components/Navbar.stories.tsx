import type { Meta, StoryObj } from '@storybook/react-vite';
import { forceState, type StatesParameter } from '../stories/states';
import { Navbar } from './Navbar';

const states: StatesParameter = {
  notApplicable: {
    Disabled:
      'Every destination is always reachable; a page that is not ready says so itself (the Planned routes).',
    Error:
      'The navbar shows no fetched data: the cart count comes from the device, so there is nothing to fail.',
  },
};

const meta = {
  title: 'Core/Navbar',
  component: Navbar,
  args: {
    brand: 'BrandStore',
    links: [
      { to: '/', label: 'Home' },
      { to: '/products', label: 'Products' },
      { to: '/compare', label: 'Compare' },
    ],
    cartCount: 2,
    account: { to: '/login', label: 'Sign in' },
  },
  parameters: { layout: 'fullscreen', states },
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The current route's link has aria-current="page"; the cart link reads "Cart, 2 items". */
export const Default: Story = {};
export const Hover: Story = { decorators: [forceState('hover')] };
export const Focus: Story = { decorators: [forceState('focus')] };
/** The cart count is not known yet: a placeholder badge, and the link reads "Cart". */
export const Loading: Story = { args: { loading: true } };
export const SignedIn: Story = { args: { account: { to: '/account/orders', label: 'Account' } } };
/** Phone width: the links fold behind "Menu" (aria-expanded); Escape closes it. */
export const MobileMenuOpen: Story = {
  args: { defaultOpen: true },
  globals: { viewport: { value: 'mobile1' } },
};
