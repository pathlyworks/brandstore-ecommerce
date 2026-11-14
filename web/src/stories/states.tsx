/**
 * The six states every core component documents (Advanced Task 2): each stories file exports a story with
 * exactly these names, or lists the state in `parameters.states.notApplicable` with the reason.
 * stories.states.test.ts checks that.
 *
 * Hover and focus are shown with `data-force` (styles/index.css redefines `hover:` and `focus-visible:` so an
 * element inside [data-force="hover"] looks hovered), so the stories need no pointer or keyboard.
 */
import type { Decorator } from '@storybook/react-vite';

export const UI_STATES = ['Default', 'Hover', 'Focus', 'Disabled', 'Error', 'Loading'] as const;
export type UiState = (typeof UI_STATES)[number];

export interface StatesParameter {
  notApplicable?: Partial<Record<UiState, string>>;
}

export function forceState(state: 'hover' | 'focus'): Decorator {
  function ForcedState(Story: Parameters<Decorator>[0]) {
    return (
      <div data-force={state}>
        <Story />
      </div>
    );
  }
  return ForcedState;
}
