import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { forceState } from '../stories/states';
import { Button } from './Button';
import { Modal } from './Modal';

const meta = {
  title: 'Core/Modal',
  component: Modal,
  args: {
    open: true,
    title: 'Empty the cart?',
    onClose: () => undefined,
    children: <p>This removes all 3 items. You cannot undo it.</p>,
    actions: (
      <>
        <Button variant="secondary">Keep the items</Button>
        <Button variant="danger">Empty the cart</Button>
      </>
    ),
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Open: focus is inside, Tab stays inside, Escape and the backdrop close it. */
export const Default: Story = {};
export const Hover: Story = { decorators: [forceState('hover')] };
/** Focus moves to the first control when the dialog opens. */
export const Focus: Story = { decorators: [forceState('focus')] };
/** `busy` with disabled actions: Escape and the backdrop do nothing while a request runs. */
export const Disabled: Story = {
  args: {
    busy: true,
    actions: (
      <>
        <Button variant="secondary" disabled>
          Keep the items
        </Button>
        <Button variant="danger" disabled>
          Empty the cart
        </Button>
      </>
    ),
  },
};
export const Error: Story = { args: { error: 'The cart could not be emptied. Try again.' } };
export const Loading: Story = {
  args: {
    busy: true,
    actions: (
      <>
        <Button variant="secondary" disabled>
          Keep the items
        </Button>
        <Button variant="danger" loading loadingLabel="Emptying the cart">
          Empty the cart
        </Button>
      </>
    ),
  },
};

/** Opened from a button; focus goes back to it on close. */
export const Interactive: Story = {
  args: { open: false },
  render: function InteractiveModal(args) {
    const [open, setOpen] = useState(false);
    return (
      <div className="p-md">
        <Button onClick={() => setOpen(true)}>Empty the cart…</Button>
        <Modal
          {...args}
          open={open}
          onClose={() => setOpen(false)}
          actions={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Keep the items
              </Button>
              <Button variant="danger" onClick={() => setOpen(false)}>
                Empty the cart
              </Button>
            </>
          }
        />
      </div>
    );
  },
};
