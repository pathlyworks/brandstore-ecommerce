import type { Meta, StoryObj } from '@storybook/react-vite';
import { forceState } from '../stories/states';
import { ErrorState, LoadingState } from './StatusMessage';
import { Tabs, type TabItem } from './Tabs';

type ProductTab = 'overview' | 'specs' | 'reviews';

const TABS: readonly TabItem<ProductTab>[] = [
  { id: 'overview', label: 'Overview', panel: <p>Rated 4 of 5 from 128 reviews.</p> },
  { id: 'specs', label: 'Specifications', panel: <p>Warranty: 1 year.</p> },
  { id: 'reviews', label: 'Reviews', panel: <p>Reviews arrive in a later wave.</p> },
];

const meta = {
  title: 'Core/Tabs',
  component: Tabs<ProductTab>,
  args: { label: 'Product information', tabs: TABS, defaultValue: 'overview' },
} satisfies Meta<typeof Tabs<ProductTab>>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One tab stop; Left/Right/Home/End move between tabs. */
export const Default: Story = {};
export const Hover: Story = { decorators: [forceState('hover')] };
export const Focus: Story = { decorators: [forceState('focus')] };
/** A disabled tab is skipped by the arrow keys. */
export const Disabled: Story = {
  args: { tabs: TABS.map((tab) => (tab.id === 'reviews' ? { ...tab, disabled: true } : tab)) },
};
/** The selected panel failed to load: the panel shows the error, the tabs keep working. */
export const Error: Story = {
  args: {
    defaultValue: 'specs',
    tabs: TABS.map((tab) =>
      tab.id === 'specs'
        ? {
            ...tab,
            panel: (
              <ErrorState
                error={{
                  status: 503,
                  code: 'SERVER_ERROR',
                  message: 'Unavailable',
                  retryAfter: null,
                }}
              />
            ),
          }
        : tab,
    ),
  },
};
export const Loading: Story = {
  args: {
    defaultValue: 'specs',
    tabs: TABS.map((tab) =>
      tab.id === 'specs' ? { ...tab, panel: <LoadingState label="Loading specifications" /> } : tab,
    ),
  },
};
