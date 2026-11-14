/**
 * Tabs<T>: the ARIA tabs pattern. T is the union of tab ids, so `value` and `onChange` cannot name a tab that
 * does not exist. One tab stop (roving tabindex); Left/Right/Home/End move between enabled tabs and select
 * them; each panel is labelled by its tab. Works controlled (value + onChange) or uncontrolled (defaultValue).
 */
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  panel: ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string> {
  label: string;
  tabs: readonly TabItem<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (id: T) => void;
  className?: string;
}

export function Tabs<T extends string>({
  label,
  tabs,
  value,
  defaultValue,
  onChange,
  className,
}: TabsProps<T>) {
  const base = useId();
  const firstEnabled = tabs.find((t) => !t.disabled)?.id;
  const [inner, setInner] = useState<T | undefined>(defaultValue ?? firstEnabled);
  const selected = value ?? inner;
  const buttons = useRef(new Map<T, HTMLButtonElement>());

  function select(id: T) {
    if (value === undefined) setInner(id);
    onChange?.(id);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const enabled = tabs.filter((t) => !t.disabled);
    const position = enabled.findIndex((t) => t.id === tabs[index]?.id);
    const moves: Record<string, number> = {
      ArrowRight: position + 1,
      ArrowLeft: position - 1,
      Home: 0,
      End: enabled.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined || enabled.length === 0) return;
    event.preventDefault();
    const next = enabled[(target + enabled.length) % enabled.length];
    if (!next) return;
    select(next.id);
    buttons.current.get(next.id)?.focus();
  }

  return (
    <div className={cn('flex flex-col gap-md', className)}>
      <div role="tablist" aria-label={label} className="flex gap-2xs border-b-2 border-border">
        {tabs.map((tab, index) => {
          const isSelected = tab.id === selected;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                if (node) buttons.current.set(tab.id, node);
                else buttons.current.delete(tab.id);
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => select(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                '-mb-0.5 min-h-(--size-tap-target) border-b-4 px-md text-md font-semibold',
                isSelected
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text hover:border-border-control',
                'focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(length:--focus-ring-offset) focus-visible:outline-primary focus-visible:outline-solid',
                'disabled:cursor-not-allowed disabled:text-disabled-text',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={tab.id !== selected}
          tabIndex={0}
          className="focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-primary focus-visible:outline-solid"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
