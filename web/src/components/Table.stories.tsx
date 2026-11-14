import type { Meta, StoryObj } from '@storybook/react-vite';
import { forceState } from '../stories/states';
import { Badge } from './Badge';
import { Table, type Column } from './Table';

interface OrderRow {
  id: string;
  placed: string;
  total: number;
  status: 'processing' | 'shipped' | 'delivered';
}

const ROWS: readonly OrderRow[] = [
  { id: 'o-001', placed: '1 Aug 2026', total: 2499, status: 'processing' },
  { id: 'o-002', placed: '20 Jul 2026', total: 15999, status: 'shipped' },
  { id: 'o-003', placed: '2 Jul 2026', total: 899, status: 'delivered' },
];

/** Typed by the row: `cell` and `sortValue` get an OrderRow, so a column cannot read a field that is not there. */
const COLUMNS: readonly Column<OrderRow>[] = [
  { id: 'id', header: 'Order', rowHeader: true, cell: (row) => row.id, sortValue: (row) => row.id },
  { id: 'placed', header: 'Placed', cell: (row) => row.placed },
  {
    id: 'total',
    header: 'Total',
    align: 'end',
    cell: (row) => `EGP ${row.total.toLocaleString('en-GB')}`,
    sortValue: (row) => row.total,
  },
  { id: 'status', header: 'Status', cell: (row) => <Badge tone="info">{row.status}</Badge> },
];

const meta = {
  title: 'Core/Table',
  component: Table<OrderRow>,
  args: {
    caption: 'Your orders',
    columns: COLUMNS,
    rows: ROWS,
    getRowKey: (row: OrderRow) => row.id,
  },
} satisfies Meta<typeof Table<OrderRow>>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Rows keyed by order id (getRowKey), so sorting keeps each row's identity. */
export const Default: Story = {};
/** Row hover and the sortable header buttons. */
export const Hover: Story = { decorators: [forceState('hover')] };
export const Focus: Story = { decorators: [forceState('focus')] };
/** No sortable columns: a static table with no controls. */
export const Disabled: Story = {
  args: { columns: COLUMNS.map((column) => ({ ...column, sortValue: undefined })) },
};
export const Error: Story = {
  args: { error: 'Your orders could not be loaded.', onRetry: () => undefined },
};
export const Loading: Story = { args: { loading: true, skeletonRows: 3 } };
export const Empty: Story = {
  args: { rows: [], emptyMessage: 'You have not placed any orders yet.' },
};
