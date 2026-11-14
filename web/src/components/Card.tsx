/**
 * Card: a surface for one item (a product, an order). With `href` the whole card is one link (the heading
 * holds the link, stretched over the card), so it is one tab stop and its name is the heading. `loading`
 * renders a same-sized skeleton; `tone="danger"` marks an error card.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../lib/cn';

export interface CardProps {
  heading?: ReactNode;
  headingLevel?: 2 | 3;
  /** Makes the whole card a link to this route. */
  href?: string;
  media?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  loading?: boolean;
  /** Visually and semantically unavailable (aria-disabled), e.g. out of stock. */
  disabled?: boolean;
  tone?: 'default' | 'danger';
  className?: string;
}

export function Card({
  heading,
  headingLevel = 3,
  href,
  media,
  footer,
  children,
  loading = false,
  disabled = false,
  tone = 'default',
  className,
}: CardProps) {
  if (loading) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          'flex flex-col gap-sm rounded-md border border-border bg-surface p-md',
          className,
        )}
      >
        <div className="aspect-(--ratio-media) animate-pulse rounded-sm bg-disabled-bg motion-reduce:animate-none" />
        <div className="h-5 w-3/4 animate-pulse rounded-sm bg-disabled-bg motion-reduce:animate-none" />
        <div className="h-4 w-1/3 animate-pulse rounded-sm bg-disabled-bg motion-reduce:animate-none" />
      </div>
    );
  }
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <article
      aria-disabled={disabled || undefined}
      className={cn(
        'relative flex flex-col gap-sm rounded-md border bg-surface p-md shadow-sm',
        tone === 'danger' ? 'border-danger' : 'border-border',
        href &&
          !disabled &&
          'transition-shadow duration-200 hover:border-primary hover:shadow-md focus-within:border-primary focus-within:shadow-md',
        disabled && 'opacity-70',
        className,
      )}
    >
      {media}
      {heading !== undefined && (
        <Heading className="text-lg font-semibold leading-snug text-text">
          {href ? (
            <Link
              to={href}
              className="after:absolute after:inset-0 after:rounded-md hover:text-primary focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(length:--focus-ring-offset) focus-visible:outline-primary focus-visible:outline-solid"
            >
              {heading}
            </Link>
          ) : (
            heading
          )}
        </Heading>
      )}
      {children}
      {footer && <div className="relative mt-auto">{footer}</div>}
    </article>
  );
}
