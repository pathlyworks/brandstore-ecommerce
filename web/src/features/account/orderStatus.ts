/** One tone per order status, shared by the shopper's orders and the admin dashboard (the text carries the meaning). */
import type { Order } from '@shared/domain';
import type { BadgeTone } from '../../components';

export const STATUS_TONE: Record<Order['status'], BadgeTone> = {
  processing: 'info',
  shipped: 'success',
  delivered: 'success',
  cancelled: 'neutral',
};
