/** The MSW server for the tests (Node), over the handlers in handlers.ts. */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export { api, apiState, handlers } from './handlers';
export const server = setupServer(...handlers);
