/** Unit tests for the newsletter email rules (src/utils/validate.js getEmailError). */
import { describe, expect, it } from 'vitest';
import { getEmailError } from '../../src/utils/validate.js';

describe('getEmailError', () => {
  const cases = [
    ['', 'Enter your email address.'],
    ['   ', 'Enter your email address.'],
    ['abc', 'Add an “@” to the email address, like name@example.com.'],
    ['a@', 'Add the part after the “@”, like example.com.'],
    ['@b.com', 'Add the part before the “@”, like name.'],
    ['a@@b.com', 'Use only one “@” in the email address.'],
    ['a b@c.com', 'Remove the spaces from the email address.'],
    ['name@example', 'The part after the “@” needs a dot, like example.com.'],
    [
      'name@exa..mple.com',
      'Check the domain after the “@”: no empty parts between dots and no unusual characters.',
    ],
    [`${'a'.repeat(115)}@b.com`, 'That address is too long. Use 120 characters or fewer.'],
  ];
  for (const [input, message] of cases) {
    it(`rejects ${JSON.stringify(input.length > 20 ? `${input.slice(0, 8)}...` : input)}`, () => {
      expect(getEmailError(input)).toBe(message);
    });
  }

  it('accepts valid addresses, ignoring surrounding spaces', () => {
    for (const ok of ['name@example.com', " o'neil+shop@mail.example.co.uk "]) {
      expect(getEmailError(ok)).toBe('');
    }
  });
});
