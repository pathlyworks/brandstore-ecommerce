/**
 * /account: a nested layout route. It guards the section, shows who is signed in and a tab-style nav
 * (NavLinks, so the open section has aria-current), and renders the child route in its <Outlet />.
 */
import { NavLink, Outlet } from 'react-router';
import { cn } from '../../lib/cn';
import { useAuth } from '../../state/AuthContext';

const SECTIONS = [
  { to: '/account/orders', label: 'Orders' },
  { to: '/account/addresses', label: 'Addresses' },
] as const;

/** Rendered inside <ProtectedRoute> (app/routes.tsx), so a valid session is guaranteed here. */
export function AccountLayout() {
  const { session } = useAuth();
  // "Sign out" is in the header on every page (RootLayout), not repeated here.
  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <p className="text-text-muted">
          Signed in as <strong className="text-text">{session?.user.name}</strong>
        </p>
      </div>
      <nav aria-label="Account sections">
        <ul className="flex gap-xs border-b border-border">
          {SECTIONS.map((section) => (
            <li key={section.to}>
              <NavLink
                to={section.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex min-h-(--size-tap-target) items-center border-b-(length:--border-medium) px-sm font-semibold',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text hover:text-primary',
                  )
                }
              >
                {section.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
