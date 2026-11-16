import { createBrowserRouter } from 'react-router';
import { routes } from './routes';

// BASE_URL is "/" normally and "/brandstore-ecommerce/" in the GitHub Pages build (VITE_BASE).
export const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
});
