import type { Preview } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import '../src/styles/index.css';

const preview: Preview = {
  // Links (Navbar, Footer, Card) need a router; a MemoryRouter keeps the stories self-contained.
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="bg-bg p-md font-sans text-text">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    // A violation fails the story in the a11y panel (and in the Vitest run of the stories).
    a11y: { test: 'error' },
  },
  tags: ['autodocs'],
};

export default preview;
