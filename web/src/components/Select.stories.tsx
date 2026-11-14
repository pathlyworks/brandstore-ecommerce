import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { forceState } from '../stories/states';
import { Select, type SelectOption } from './Select';

type Sort = 'featured' | 'price_asc' | 'price_desc' | 'rating';

const SORTS: readonly SelectOption<Sort>[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Best rated' },
];

const meta = {
  title: 'Core/Select',
  component: Select<Sort>,
  args: { label: 'Sort by', options: SORTS, value: 'featured', onChange: () => undefined },
} satisfies Meta<typeof Select<Sort>>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Typed: `value` and `onChange` only accept the four sorts the API knows. */
export const Default: Story = {
  render: function TypedSelect(args) {
    const [value, setValue] = useState<Sort>(args.value);
    return <Select<Sort> {...args} value={value} onChange={setValue} />;
  },
};
export const Hover: Story = { decorators: [forceState('hover')] };
export const Focus: Story = { decorators: [forceState('focus')] };
export const Disabled: Story = { args: { disabled: true } };
export const Error: Story = { args: { error: 'Choose how to sort the products.' } };
/** While the options are being fetched. */
export const Loading: Story = { args: { loading: true } };
