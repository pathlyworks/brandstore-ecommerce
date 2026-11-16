/**
 * Toasts: short confirmations ("Added 2 × Nova Laptops 1 to the cart"). One live region (aria-live="polite";
 * no role="status", so a page's own status line stays the only one with that role, and no aria-label,
 * which is not allowed on a div without a role: Lighthouse found that one, Task 5) is always in the page, empty until a message arrives, so screen readers have
 * registered it before the first update and read every message without moving focus. Each message stays
 * five seconds (longer than a screen reader needs to start reading it) and can be dismissed.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ToastItem {
  id: number;
  text: string;
}

interface ToastContextValue {
  show: (text: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
export const TOAST_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);
  // Stable identity: every screen that shows a toast puts `show` in effect dependencies.
  const show = useCallback(
    (text: string) => {
      const id = next.current++;
      setItems((list) => [...list.slice(-2), { id, text }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_MS),
      );
    },
    [dismiss],
  );
  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);
  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-md z-(--z-header) flex flex-col items-center gap-xs px-md"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-sm rounded-md bg-dark px-md py-sm text-sm text-white shadow-lg"
          >
            <span>{t.text}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="min-h-(--size-tap-target) rounded-sm px-xs font-semibold text-white underline focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-white focus-visible:outline-solid"
            >
              Close
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** `show(text)`; outside a provider (isolated component tests) it does nothing. */
export function useToast(): ToastContextValue {
  return useContext(ToastContext) ?? { show: () => undefined };
}
