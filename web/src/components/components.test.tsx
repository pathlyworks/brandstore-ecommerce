/** Behaviour of the core components that their types cannot guarantee. */
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, Input, Modal, Select, Table, Tabs, type Column } from '.';

describe('Button', () => {
  it('ignores clicks while loading but stays focusable', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: /save/i });
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.tab();
    expect(button).toHaveFocus();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Input', () => {
  it('links the error message and marks the field invalid', () => {
    render(<Input label="Email" error="Enter your email address." />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/enter your email address/i);
  });
});

describe('Select<T>', () => {
  it('hands back a typed value', async () => {
    type Size = 'sm' | 'lg';
    const onChange = vi.fn<(value: Size) => void>();
    render(
      <Select<Size>
        label="Size"
        value="sm"
        onChange={onChange}
        options={[
          { value: 'sm', label: 'Small' },
          { value: 'lg', label: 'Large' },
        ]}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText('Size'), 'Large');
    expect(onChange).toHaveBeenCalledWith('lg');
  });
});

interface Row {
  id: string;
  name: string;
  price: number;
}
const columns: readonly Column<Row>[] = [
  { id: 'name', header: 'Name', rowHeader: true, cell: (r) => r.name, sortValue: (r) => r.name },
  { id: 'price', header: 'Price', cell: (r) => r.price, sortValue: (r) => r.price },
];
const rows: Row[] = [
  { id: 'b', name: 'Beta', price: 20 },
  { id: 'a', name: 'Alpha', price: 30 },
  { id: 'c', name: 'Gamma', price: 10 },
];

describe('Table<Row>', () => {
  const names = () => screen.getAllByRole('rowheader').map((cell) => cell.textContent);

  it('sorts by a column and says so with aria-sort', async () => {
    render(<Table caption="Products" columns={columns} rows={rows} getRowKey={(r) => r.id} />);
    await userEvent.click(screen.getByRole('button', { name: /price/i }));
    expect(names()).toEqual(['Gamma', 'Beta', 'Alpha']);
    expect(screen.getByRole('columnheader', { name: /price/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    await userEvent.click(screen.getByRole('button', { name: /price/i }));
    expect(names()).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('keeps row identity by key when sorting (state inside a row moves with it)', async () => {
    const withInput: Column<Row>[] = [
      ...columns,
      { id: 'note', header: 'Note', cell: (r) => <input aria-label={`Note for ${r.name}`} /> },
    ];
    render(<Table caption="Products" columns={withInput} rows={rows} getRowKey={(r) => r.id} />);
    await userEvent.type(screen.getByLabelText('Note for Alpha'), 'keep me');
    await userEvent.click(screen.getByRole('button', { name: /price/i }));
    expect(screen.getByLabelText('Note for Alpha')).toHaveValue('keep me');
  });

  it('shows the loading, error and empty states', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <Table caption="T" columns={columns} rows={[]} getRowKey={(r) => r.id} loading />,
    );
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    rerender(
      <Table
        caption="T"
        columns={columns}
        rows={[]}
        getRowKey={(r) => r.id}
        error="Failed"
        onRetry={onRetry}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
    rerender(
      <Table
        caption="T"
        columns={columns}
        rows={[]}
        getRowKey={(r) => r.id}
        emptyMessage="Nothing yet"
      />,
    );
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
  });
});

describe('Tabs<T>', () => {
  it('moves with the arrow keys and skips disabled tabs', async () => {
    render(
      <Tabs<'a' | 'b' | 'c'>
        label="Info"
        tabs={[
          { id: 'a', label: 'A', panel: 'Panel A' },
          { id: 'b', label: 'B', panel: 'Panel B', disabled: true },
          { id: 'c', label: 'C', panel: 'Panel C' },
        ]}
      />,
    );
    await userEvent.tab();
    expect(screen.getByRole('tab', { name: 'A' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'C' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel C');
  });
});

describe('Modal', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open</button>
        <Modal
          open={open}
          title="Empty the cart?"
          onClose={() => setOpen(false)}
          actions={<button onClick={() => setOpen(false)}>Cancel</button>}
        >
          <p>Sure?</p>
        </Modal>
      </>
    );
  }

  it('moves focus in, closes on Escape and gives focus back', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Empty the cart?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
