/** Join class names, skipping false, null and undefined (no dependency needed for this). */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
