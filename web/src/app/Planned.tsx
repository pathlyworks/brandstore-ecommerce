/** Placeholder for a route that is mapped but not migrated yet: says which wave brings it and where it lives now. */
import { useEffect } from 'react';

export function Planned({ title, wave, legacy }: { title: string; wave: number; legacy: string }) {
  useEffect(() => {
    document.title = `${title} · BrandStore`;
  }, [title]);
  return (
    <section aria-labelledby="page-title">
      <h1 id="page-title">{title}</h1>
      <p>
        Migrates in wave {wave}. Until then this page is served by the legacy site ({legacy}).
      </p>
    </section>
  );
}
