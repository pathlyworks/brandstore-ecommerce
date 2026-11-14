/** The catch-all route (`*`): the React counterpart of 404.html. */
import { Link } from 'react-router';

export function NotFoundRoute() {
  return (
    <section aria-labelledby="page-title">
      <h1 id="page-title">Page not found</h1>
      <p>
        The page you asked for does not exist. <Link to="/products">Browse the products</Link>.
      </p>
    </section>
  );
}
