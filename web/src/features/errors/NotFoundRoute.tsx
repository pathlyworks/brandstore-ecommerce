/** The catch-all route (`*`): the React counterpart of 404.html, inside the layout (header and footer stay). */
import { Link, useLocation } from 'react-router';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export function NotFoundRoute() {
  useDocumentTitle('Page not found');
  const { pathname } = useLocation();
  return (
    <section aria-labelledby="page-title" className="flex flex-col gap-sm">
      <h1 id="page-title" className="text-h1 font-extrabold tracking-tight text-text">
        Page not found
      </h1>
      <p className="text-text-muted">
        There is no page at <code className="font-semibold text-text">{pathname}</code>.
      </p>
      <p>
        <Link to="/products" className="font-semibold text-primary underline">
          Browse the products
        </Link>{' '}
        or go to the{' '}
        <Link to="/" className="font-semibold text-primary underline">
          home page
        </Link>
        .
      </p>
    </section>
  );
}
