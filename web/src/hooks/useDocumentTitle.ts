/** "Products · BrandStore"; the previous title comes back when the component unmounts. */
import { useEffect } from 'react';

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · BrandStore`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
