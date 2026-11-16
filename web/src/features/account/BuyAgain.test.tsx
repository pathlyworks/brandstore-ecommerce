import { render } from '@testing-library/react';
import { it, expect } from 'vitest';
import { BuyAgain } from './BuyAgain';

it('renders', async () => {
  const order = await (await fetch('http://localhost:4010/account/orders')).json();
  const { container } = render(<BuyAgain order={order.items[0]} />);
  expect(container).toMatchSnapshot();
});
