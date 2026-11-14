import type { FooterGroup, NavItem } from '../components';

export const MAIN_LINKS: readonly NavItem[] = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Products' },
  { to: '/compare', label: 'Compare' },
];

export const FOOTER_GROUPS: readonly FooterGroup[] = [
  {
    title: 'Shop',
    links: [
      { to: '/products', label: 'All products' },
      { to: '/products?category=laptops', label: 'Laptops' },
      { to: '/products?category=audio', label: 'Audio' },
    ],
  },
  {
    title: 'Your account',
    links: [
      { to: '/login', label: 'Sign in' },
      { to: '/account/orders', label: 'Orders' },
      { to: '/cart', label: 'Cart' },
    ],
  },
  {
    title: 'Help',
    links: [
      { to: '/compare', label: 'Compare products' },
      { to: '/checkout', label: 'Checkout' },
    ],
  },
];
