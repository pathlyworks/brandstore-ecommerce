/**
 * BarChart<Datum>: a hand-built SVG bar chart (no chart library: the dashboard has two simple charts, and a
 * library would add tens of kilobytes to the admin chunk for them). Generic over the datum, so the category
 * chart (horizontal) and the monthly trend (vertical) share one implementation.
 *
 * Accessibility: the SVG is one image with a title and a one-sentence summary (role="img"); the exact
 * numbers are in the DataTable next to each chart, which is the chart's table view. Each bar has a <title>,
 * so hovering a bar shows its value. Text uses text colours, never the bar colour.
 */
import { useId } from 'react';

export interface BarChartProps<Datum> {
  title: string;
  /** One sentence a screen reader hears instead of the picture, e.g. which bar is largest. */
  summary: string;
  data: readonly Datum[];
  getKey: (d: Datum) => string;
  getLabel: (d: Datum) => string;
  getValue: (d: Datum) => number;
  formatValue: (value: number) => string;
  orientation?: 'horizontal' | 'vertical';
}

const W = 400;
const V_H = 220;
const V_AXIS = 28;
const V_TOP = 24;

export function BarChart<Datum>({
  title,
  summary,
  data,
  getKey,
  getLabel,
  getValue,
  formatValue,
  orientation = 'horizontal',
}: BarChartProps<Datum>) {
  const titleId = useId();
  const descId = useId();
  const max = Math.max(0, ...data.map(getValue));
  const scale = (v: number, room: number) =>
    max > 0 ? Math.max(v > 0 ? 2 : 0, (v / max) * room) : 0;

  if (orientation === 'horizontal') {
    // HTML and CSS: the labels keep their real text size at every screen width.
    return (
      <figure aria-labelledby={titleId} className="flex flex-col gap-xs">
        <figcaption id={titleId} className="text-sm font-semibold text-text-muted">
          {title}
        </figcaption>
        <p className="sr-only">{summary}</p>
        <ul aria-hidden="true" className="flex flex-col gap-xs">
          {data.map((d) => {
            const value = getValue(d);
            const width = max > 0 ? Math.max(value > 0 ? 1 : 0, (value / max) * 100) : 0;
            return (
              <li
                key={getKey(d)}
                title={`${getLabel(d)}: ${formatValue(value)}`}
                className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-sm text-sm"
              >
                <span className="truncate text-text">{getLabel(d)}</span>
                <span className="h-5 rounded-sm bg-bg">
                  <span
                    className="block h-5 rounded-sm bg-primary"
                    style={{ width: `${width}%` }}
                  />
                </span>
                <span className="font-semibold text-text tabular-nums">{formatValue(value)}</span>
              </li>
            );
          })}
        </ul>
      </figure>
    );
  }

  const slot = data.length > 0 ? W / data.length : W;
  const barW = Math.min(64, slot * 0.6);
  const plot = V_H - V_AXIS - V_TOP;
  const peak = data.reduce<Datum | undefined>(
    (best, d) => (best === undefined || getValue(d) > getValue(best) ? d : best),
    undefined,
  );
  return (
    <svg
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      viewBox={`0 0 ${W} ${V_H}`}
      className="h-auto w-full max-w-(--size-chart-max)"
    >
      <title id={titleId}>{title}</title>
      <desc id={descId}>{summary}</desc>
      <line x1={0} x2={W} y1={V_TOP + plot} y2={V_TOP + plot} className="stroke-border-control" />
      {[0.5, 1].map((f) => (
        <line
          key={f}
          x1={0}
          x2={W}
          y1={V_TOP + plot - plot * f}
          y2={V_TOP + plot - plot * f}
          className="stroke-border"
          strokeDasharray="4 4"
        />
      ))}
      {data.map((d, i) => {
        const value = getValue(d);
        const h = scale(value, plot);
        const x = i * slot + (slot - barW) / 2;
        return (
          <g key={getKey(d)}>
            <rect
              x={x}
              y={V_TOP + plot - h}
              width={barW}
              height={h}
              rx={4}
              className="fill-primary"
            >
              <title>{`${getLabel(d)}: ${formatValue(value)}`}</title>
            </rect>
            {d === peak && (
              <text
                x={x + barW / 2}
                y={V_TOP + plot - h - 6}
                textAnchor="middle"
                className="fill-text text-sm font-semibold tabular-nums"
              >
                {formatValue(value)}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={V_H - 8}
              textAnchor="middle"
              className="fill-text-muted text-sm"
            >
              {getLabel(d)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
