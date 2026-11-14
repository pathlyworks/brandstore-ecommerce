/**
 * During checkout: a warning when the session has less than 5 minutes left, so the shopper knows before
 * "Place order" is refused. If it does run out, the single re-authentication path takes over (sign in, then back
 * to the same checkout step with the cart and the entered details kept).
 */
import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const WARN_BEFORE_MS = 5 * 60_000;

export function SessionExpiryNotice() {
  const { session } = useAuth();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const left = session ? session.expiresAt - now : 0;
  if (!session || left > WARN_BEFORE_MS || left <= 0) return null;
  const minutes = Math.max(1, Math.ceil(left / 60_000));
  return (
    <p role="status" className="rounded-md border-2 border-accent bg-accent-soft p-sm text-text">
      Your session ends in about {minutes} {minutes === 1 ? 'minute' : 'minutes'}. Place your order
      before then. If it ends, you will be asked to sign in again and brought back here with your
      cart and details kept.
    </p>
  );
}
