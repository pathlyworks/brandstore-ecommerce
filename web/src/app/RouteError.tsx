/** The layout route's error element: anything thrown while rendering a route ends here, inside the shell. */
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';
  return (
    <main id="main" className="mx-auto max-w-(--container-measure) p-lg">
      <h1 className="text-h2 font-bold text-text">Something went wrong</h1>
      <p className="mt-xs text-text-muted">{message}</p>
      <p className="mt-sm">
        <Link to="/" className="font-semibold text-primary underline">
          Back to the home page
        </Link>
      </p>
    </main>
  );
}
