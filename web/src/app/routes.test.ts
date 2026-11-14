/**
 * Run from web/ (npm run test -w web). The live routing map must match the plan: every route of the table in task_1_architecture.md §4 exists
 * with the component the plan names, and the app has no route the plan does not list.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { routeMap } from './routes';

function plannedRoutes(): { path: string; component: string }[] {
  const doc = readFileSync(resolve(process.cwd(), '..', 'task_1_architecture.md'), 'utf8');
  const section = doc.slice(
    doc.indexOf('## 4. Routing map'),
    doc.indexOf('**Every legacy feature mapped**'),
  );
  return section
    .split('\n')
    .filter((line) => line.startsWith('| `'))
    .map((line) => line.split('|').map((cell) => cell.trim()))
    .filter(([, route]) => route !== undefined && !route.includes('.html'))
    .map(([, route = '', component = '']) => ({
      path: route.replace(/`/g, ''),
      component: /`(\w+)`/.exec(component)?.[1] ?? '',
    }));
}

describe('routing map', () => {
  it('reads 13 routes from the plan', () => {
    expect(plannedRoutes()).toHaveLength(13);
  });

  it('matches task_1_architecture.md §4 exactly (paths and components)', () => {
    const byPath = (a: { path: string }, b: { path: string }) => a.path.localeCompare(b.path);
    expect([...routeMap()].sort(byPath)).toEqual([...plannedRoutes()].sort(byPath));
  });
});
