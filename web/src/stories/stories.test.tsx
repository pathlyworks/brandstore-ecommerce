/**
 * Every story of every core component, rendered with the Storybook preview (router decorator) in jsdom:
 * 1. each component documents the six states (a story per state, or a reason it does not apply);
 * 2. axe-core finds no violations in any story (the same check as the Storybook accessibility addon;
 *    colour contrast is left to the addon and Lighthouse, because jsdom does not compute styles).
 */
import type { ComponentType } from 'react';
import { render } from '@testing-library/react';
import { composeStories, setProjectAnnotations, type Meta } from '@storybook/react-vite';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import preview from '../../.storybook/preview';
import { UI_STATES, type StatesParameter } from './states';

setProjectAnnotations(preview);

type StoriesModule = Record<string, unknown> & { default: Meta };
const modules = import.meta.glob<StoriesModule>('../components/*.stories.tsx', { eager: true });
const CORE = [
  'Badge',
  'Button',
  'Card',
  'Footer',
  'Input',
  'Modal',
  'Navbar',
  'Select',
  'Steps',
  'Table',
  'Tabs',
];

const entries = Object.entries(modules).map(([path, module]) => ({
  name: /(\w+)\.stories\.tsx$/.exec(path)?.[1] ?? path,
  module,
}));

describe('stories', () => {
  it('exist for all 11 core components (the 10 of Task 2 and Steps)', () => {
    expect(entries.map((e) => e.name).sort()).toEqual(CORE);
  });

  describe.each(entries)('$name', ({ module }) => {
    it('covers default, hover, focus, disabled, error and loading', () => {
      const states = (module.default.parameters?.states ?? {}) as StatesParameter;
      for (const state of UI_STATES) {
        const reason = states.notApplicable?.[state];
        const story = state in module;
        expect(
          story || (typeof reason === 'string' && reason.length > 20),
          `${state}: a story or a reason`,
        ).toBe(true);
        expect(
          story && reason,
          `${state} has a story and is also marked not applicable`,
        ).toBeFalsy();
      }
    });

    // composeStories gives one renderable component per story (with the preview's decorators applied).
    const stories = Object.entries(
      composeStories(module as Parameters<typeof composeStories>[0]),
    ) as unknown as [string, ComponentType][];
    it.each(stories)('%s has no axe violations', async (_name, Story) => {
      render(<Story />);
      const results = await axe.run(document.body, {
        rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
      });
      const problems = results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      );
      expect(problems).toEqual([]);
    });
  });
});
