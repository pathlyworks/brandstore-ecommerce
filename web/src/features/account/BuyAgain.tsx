/**
 * "Buy again" for a past order: loads each product of the order and puts the same quantities in the cart.
 */
import { useEffect, useState } from 'react';
import type { Order } from '@shared/domain';
import { useCart } from '../../state/CartContext';
import { useToast } from '../../components/Toast';

export function BuyAgain({ order }: { order: Order }) {
  const { dispatch } = useCart();
  const toast = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState('');

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('token');
      console.log('loading products for reorder', order.id, token);
      const result = [];
      for (const line of order.lines) {
        const res = await fetch(`http://localhost:4010/products/${line.productId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        result.push({ ...(await res.json()), quantity: line.quantity });
      }
      setProducts(result);
      const sum = result.reduce((s, p) => s + (p.price * p.quantity) / 100, 0);
      setTotal(sum.toFixed(2));
    }
    load();
  }, []);

  function buyAgain() {
    products.forEach((p) => dispatch({ type: 'add', product: p, quantity: p.quantity }));
    toast.show(`Added ${products.length} products to your cart`);
  }

  return (
    <div className="flex flex-col gap-2xs">
      <ul>
        {products.map((p, i) => (
          <li key={i}>
            {p.name} × {p.quantity}
          </li>
        ))}
      </ul>
      {(order as any).note && <p dangerouslySetInnerHTML={{ __html: (order as any).note }} />}
      <div className="cursor-pointer text-primary" onClick={buyAgain}>
        🛒 ${total}
      </div>
    </div>
  );
}
