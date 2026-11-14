/**
 * Navbar: the site header (one component instead of the legacy header copied into 9 pages). Links are
 * NavLinks, so the current page gets aria-current="page". Under the md breakpoint the links fold behind a
 * menu button (aria-expanded, aria-controls); Escape closes the menu and returns focus to the button, and
 * following a link closes it.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { cn } from '../lib/cn';
import { Badge } from './Badge';

export interface NavItem {
  to: string;
  label: string;
}

export interface NavbarProps {
  brand: string;
  links: readonly NavItem[];
  cartCount: number;
  /** "Sign in" or the account link. */
  account: NavItem;
  /** The cart count is not known yet (e.g. reading storage). */
  loading?: boolean;
  /** Start with the mobile menu open (stories). */
  defaultOpen?: boolean;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex min-h-(--size-tap-target) items-center rounded-sm px-sm font-semibold',
    'hover:text-primary hover:underline',
    'focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(length:--focus-ring-offset) focus-visible:outline-primary focus-visible:outline-solid',
    isActive ? 'text-primary underline decoration-2 underline-offset-4' : 'text-text',
  );

export function Navbar({
  brand,
  links,
  cartCount,
  account,
  loading = false,
  defaultOpen = false,
}: NavbarProps) {
  const [open, setOpen] = useState(defaultOpen);
  const menuId = useId();
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const cartLabel = loading ? 'Cart' : `Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`;
  return (
    <header className="sticky top-0 z-(--z-header) border-b border-border bg-surface shadow-sm">
      <div className="mx-auto flex max-w-(--container-page) flex-wrap items-center justify-between gap-sm px-md py-xs">
        <Link
          to="/"
          className="text-xl font-extrabold tracking-tight text-primary-deep focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-primary focus-visible:outline-solid"
        >
          {brand}
        </Link>
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
          className="min-h-(--size-tap-target) rounded-md border-2 border-border-control px-sm font-semibold text-text hover:border-primary focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-primary focus-visible:outline-solid md:hidden"
        >
          Menu
        </button>
        <nav
          aria-label="Main"
          id={menuId}
          className={cn('w-full md:flex md:w-auto', open ? 'block' : 'hidden')}
        >
          <ul className="flex flex-col gap-2xs md:flex-row md:items-center">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} className={linkClass} onClick={() => setOpen(false)}>
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink to={account.to} className={linkClass} onClick={() => setOpen(false)}>
                {account.label}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/cart"
                className={linkClass}
                aria-label={cartLabel}
                onClick={() => setOpen(false)}
              >
                <span aria-hidden="true" className="inline-flex items-center gap-2xs">
                  Cart{' '}
                  <Badge tone="info" loading={loading}>
                    {cartCount}
                  </Badge>
                </span>
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
