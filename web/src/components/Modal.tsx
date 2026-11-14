/**
 * Modal: a dialog over the page (role="dialog", aria-modal, labelled by its title). While open, focus moves
 * into it, Tab and Shift+Tab stay inside, Escape and the backdrop close it, the page behind does not scroll,
 * and focus returns to the control that opened it. Every listener is removed when it closes.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
  /** Buttons at the bottom (e.g. Cancel and Confirm). */
  actions?: ReactNode;
  /** A problem to show at the top of the dialog (role="alert"). */
  error?: string;
  /** Escape and the backdrop do nothing while true (e.g. while a request runs). */
  busy?: boolean;
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  title,
  onClose,
  children,
  actions,
  error,
  busy = false,
  className,
}: ModalProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);

  useEffect(() => {
    onCloseRef.current = onClose;
    busyRef.current = busy;
  }, [onClose, busy]);

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busyRef.current) {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const head = items[0];
      const tail = items[items.length - 1];
      if (!head || !tail) return;
      if (event.shiftKey && document.activeElement === head) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && document.activeElement === tail) {
        event.preventDefault();
        head.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-(--z-header) flex items-center justify-center p-md">
      <div
        aria-hidden="true"
        data-testid="modal-backdrop"
        className="absolute inset-0 bg-overlay-dark-strong"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy || undefined}
        tabIndex={-1}
        className={cn(
          'relative flex w-full max-w-(--size-form-max) flex-col gap-md rounded-md bg-surface p-lg shadow-lg',
          'focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-primary focus-visible:outline-solid',
          className,
        )}
      >
        <h2 id={titleId} className="text-h3 font-bold text-text">
          {title}
        </h2>
        {error && (
          <p
            role="alert"
            className="rounded-sm border border-danger bg-surface p-sm text-sm text-danger"
          >
            {error}
          </p>
        )}
        {children && <div className="text-md text-text">{children}</div>}
        {actions && <div className="flex flex-wrap justify-end gap-sm">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}
