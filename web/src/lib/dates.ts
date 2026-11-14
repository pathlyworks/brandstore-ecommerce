/**
 * Order dates arrive in four formats (docs/migration/observed-fields.md): "2026-08-01T10:15:00Z",
 * "02/08/2026" (day first), "2026-08-03T18:40:00+03:00" and "4 Aug 2026". Ported from src/utils/dates.js.
 */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function parseOrderDate(text: string): Date | null {
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (dmy) return utc(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  const words = /^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})$/.exec(text);
  if (words) {
    const month = MONTHS.indexOf((words[2] ?? '').toLowerCase());
    return month < 0 ? null : utc(Number(words[3]), month, Number(words[1]));
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function utc(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month, day));
  return date.getUTCDate() === day ? date : null;
}

/** "1 Aug 2026" (UTC, so the day never shifts with the viewer's time zone). */
export function formatOrderDate(date: Date | null, fallback: string): string {
  if (!date) return fallback;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
