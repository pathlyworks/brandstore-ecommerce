# web/ — the BrandStore React app

React 19 + TypeScript + Vite, React Router 7, Tailwind CSS 4 with the brand tokens, Storybook 9. Built next to
the legacy pages, following [`task_1_architecture.md`](../task_1_architecture.md); this task's write-up is
[`task_2_react_foundation.md`](../task_2_react_foundation.md).

The API is the TechSphere API at `VITE_API_BASE` (`import.meta.env.VITE_API_BASE`), default `http://localhost:4010`.

```bash
npm install                      # at the repository root (web/ is an npm workspace)
npm run dev                      # http://localhost:5173
npm run storybook                # http://localhost:6006
npm run test -w web              # Vitest + RTL + MSW + axe over every story
npm run lint -w web              # ESLint and the brand-token check
npm run typecheck -w web
npm run build -w web             # dist/; npm run preview -w web serves it on :4174
E2E_APPS=web npm run e2e         # Playwright, web/e2e/*.spec.ts
```

```
src/
  app/         routes.tsx (the routing map), RootLayout, providers, RouteError, placeholders for later waves
  components/  the core components (Button, Input, Select<T>, Card, Badge, Modal, Tabs<T>, Table<Row>, Navbar,
               Footer) with their *.stories.tsx, plus Field, Spinner, StatusMessage
  features/    one folder per area: home, catalog, product, cart, auth, account, errors
  hooks/       useApi (fetch with abort and no races), useDebouncedValue, useDocumentTitle
  api/         client.ts (fetch, ApiError), endpoints.ts, mappers.ts (wire types → domain types)
  lib/         money (integer cents), dates, cn
  styles/      index.css (Tailwind, base styles, the hover/focus variants stories can force), theme.css (generated)
  stories/     the six-state rule and the axe run over every story
  test/        Vitest setup, MSW handlers over the captured API responses
e2e/           Playwright specs (run from the root playwright.config.mjs)
```

Types shared with the plan come from `../src/types` (`@shared/api`, `@shared/domain`); test fixtures are the captured
responses in `../docs/migration/observed` (`@observed/*`).
