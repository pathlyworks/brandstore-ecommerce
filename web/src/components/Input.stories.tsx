import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { forceState } from '../stories/states';
import { Input } from './Input';

const meta = {
  title: 'Core/Input',
  component: Input,
  args: {
    label: 'Email',
    type: 'email',
    name: 'email',
    placeholder: 'name@example.com',
    defaultValue: '',
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { hint: 'We send the receipt here.' } };
export const Hover: Story = { decorators: [forceState('hover')] };
export const Focus: Story = { decorators: [forceState('focus')] };
export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'student@techsphere.test' },
};
/** aria-invalid, and the message is linked with aria-describedby. */
export const Error: Story = {
  args: { defaultValue: 'student@', error: 'Enter an email address like name@example.com.' },
};
/** A spinner in the field and aria-busy, e.g. while checking the address. */
export const Loading: Story = { args: { loading: true, defaultValue: 'student@techsphere.test' } };

/** Controlled: the value lives in React state. */
export const Controlled: Story = {
  render: function ControlledInput(args) {
    const [value, setValue] = useState('');
    return (
      <div className="flex flex-col gap-xs">
        <Input
          {...args}
          defaultValue={undefined}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <p className="text-sm text-text-muted">Value: {value || '(empty)'}</p>
      </div>
    );
  },
};
