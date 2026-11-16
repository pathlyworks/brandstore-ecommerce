/** Footer: link groups and the small print (one component instead of 9 copies in 4 versions). */
import { memo } from 'react';
import { Link } from 'react-router';
import type { NavItem } from './Navbar';

export interface FooterGroup {
  title: string;
  links: readonly NavItem[];
}

export interface FooterProps {
  groups: readonly FooterGroup[];
  note: string;
}

function FooterBase({ groups, note }: FooterProps) {
  return (
    <footer className="mt-xl bg-dark text-text-on-dark">
      <div className="mx-auto grid max-w-(--container-page) gap-lg px-md py-lg md:grid-cols-3">
        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="mb-xs text-sm font-bold tracking-wider text-white uppercase">
              {group.title}
            </h2>
            <ul className="flex flex-col gap-2xs">
              {group.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="rounded-sm text-text-on-dark underline-offset-4 hover:text-white hover:underline focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(length:--focus-ring-offset) focus-visible:outline-white focus-visible:outline-solid"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="border-t border-overlay-light px-md py-sm text-center text-sm text-text-on-dark-muted">
        {note}
      </p>
    </footer>
  );
}

/**
 * Memoised because the React Profiler showed it re-rendering on every cart change (RootLayout reads the
 * cart for the header count) although its props never change. Median commit of a cart quantity change:
 * 14.1 ms without, 11.0 ms with (medians of 3 and 4 runs, CPU 4x; noisy, small, but free:
 * docs/evidence/task5/profiler-footer-memo.json). The only memo added in Task 5.
 */
export const Footer = memo(FooterBase);
