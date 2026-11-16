/**
 * Task 5 accessibility fixes in the shared components, tested the way a keyboard or screen-reader user meets
 * them: DataTable sorting and paging from the keyboard, the Search dialog's focus trap and focus return, the
 * toast live region, and badge contrast (computed from the theme tokens, since jsdom cannot render colours).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { DataTable, type Column } from './Table';
import { SearchDialog } from './SearchDialog';
import { ToastProvider, useToast } from './Toast';

interface Row {
  id: string;
  sales: number;
}
const rows: Row[] = Array.from({ length: 7 }, (_, i) => ({
  id: `r${i + 1}`,
  sales: (i * 37) % 11,
}));
const columns: Column<Row>[] = [
  { id: 'id', header: 'Row', rowHeader: true, cell: (r) => r.id, sortValue: (r) => r.id },
  { id: 'sales', header: 'Sales', align: 'end', cell: (r) => r.sales, sortValue: (r) => r.sales },
];

describe('DataTable<Row>: keyboard sorting and paging', () => {
  it('sorts with Enter on a header button and pages with Previous/Next', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        caption="Test rows"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        pageSize={3}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Rows 1–3 of 7 · page 1 of 3');

    screen.getByRole('button', { name: /Sales/ }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('columnheader', { name: /Sales/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    await user.keyboard('{Enter}');
    expect(screen.getByRole('columnheader', { name: /Sales/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    const first = within(screen.getAllByRole('row')[1]!).getAllByRole('cell')[0];
    expect(first).toHaveTextContent(String(Math.max(...rows.map((r) => r.sales))));

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('status')).toHaveTextContent('Rows 4–6 of 7 · page 2 of 3');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getAllByRole('row')).toHaveLength(2); // header + the 7th row
  });

  it('goes back to page 1 when the sort changes', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        caption="Test rows"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        pageSize={3}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: /Row/ }));
    expect(screen.getByRole('status')).toHaveTextContent('page 1 of 3');
  });

  it('the scroll container is a named, focusable region (keyboard scrolling of wide tables)', () => {
    render(<DataTable caption="Test rows" columns={columns} rows={rows} getRowKey={(r) => r.id} />);
    const region = screen.getByRole('region', { name: 'Test rows' });
    expect(region).toHaveAttribute('tabindex', '0');
  });
});

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

describe('SearchDialog (Modal): focus trap and focus return', () => {
  function setup() {
    render(
      <MemoryRouter initialEntries={['/']}>
        <SearchDialog />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    return screen.getByRole('button', { name: 'Search' });
  }

  it('says it opens a dialog, moves focus in, keeps Tab inside, and Escape returns focus', async () => {
    const user = userEvent.setup();
    const trigger = setup();
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Search products' });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    for (let i = 0; i < 8; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    await user.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('searches the catalog', async () => {
    const user = userEvent.setup();
    await user.click(setup());
    await user.type(screen.getByLabelText('Product name'), 'nova');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Search' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/products?search=nova');
  });
});

function Trigger() {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.show('Added 1 × Nova Laptops 1 to the cart.')}>
      Add
    </button>
  );
}

describe('Toast live region', () => {
  it('exists (empty) before any message, then carries the message', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    const region = container.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region).toBeEmptyDOMElement();
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(region).toHaveTextContent('Added 1 × Nova Laptops 1 to the cart.');
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(region).toBeEmptyDOMElement();
  });
});

// ---- Contrast of every Badge tone (WCAG 2.x relative luminance), from the theme's colour tokens.
const theme = readFileSync(resolve(__dirname, '../styles/theme.css'), 'utf8');
const token = (name: string) => {
  const m = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(theme);
  if (!m?.[1]) throw new Error(`no colour token ${name}`);
  return m[1];
};
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(token(a)), lum(token(b))].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe('Badge contrast (text on its background, WCAG AA 4.5:1 for small text)', () => {
  // Pairs as Badge.tsx uses them: [text, background].
  const pairs: Record<string, [string, string]> = {
    neutral: ['text', 'bg'],
    info: ['primary-deep', 'primary-soft'],
    success: ['success', 'surface'],
    warning: ['accent', 'accent-soft'],
    danger: ['danger', 'surface'],
    muted: ['text-muted', 'disabled-bg'],
    'nav cart count (info)': ['primary-deep', 'primary-soft'],
  };
  it.each(Object.entries(pairs))('%s is at least 4.5:1', (_, [fg, bg]) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('the old muted pair (disabled-text on disabled-bg) was below 4.5:1: the bug this fixes', () => {
    expect(ratio('disabled-text', 'disabled-bg')).toBeLessThan(4.5);
  });

  it('Badge.tsx uses the pairs tested above', () => {
    const badge = readFileSync(resolve(__dirname, 'Badge.tsx'), 'utf8');
    expect(badge).toContain("'border-disabled-bg bg-disabled-bg text-text-muted'");
    expect(badge).toContain("warning: 'bg-accent-soft text-accent border-accent'");
  });
});
