/** A route that is in the routing map but migrates in a later wave: says which, and where it lives meanwhile. */
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export interface PlannedProps {
  title: string;
  wave: number;
  legacy: string;
}

export function Planned({ title, wave, legacy }: PlannedProps) {
  useDocumentTitle(title);
  return (
    <section aria-labelledby="page-title" className="flex flex-col gap-xs">
      <h1 id="page-title" className="text-h2 font-bold text-text">
        {title}
      </h1>
      <p className="text-text-muted">
        Migrates in wave {wave} (task_1_architecture.md §9). Until then this page is served by the
        legacy site ({legacy}).
      </p>
    </section>
  );
}
