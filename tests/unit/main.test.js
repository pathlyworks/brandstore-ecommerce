/** Unit tests for src/main.js start(): features run in order and one failure cannot stop the rest. */
import { describe, expect, it } from 'vitest';
import { start } from '../../src/main.js';

describe('start', () => {
  it('runs every feature in order', () => {
    const ran = [];
    start([
      ['a', () => ran.push('a')],
      ['b', () => ran.push('b')],
    ]);
    expect(ran).toEqual(['a', 'b']);
  });

  it('reports a failing feature and still runs the next one', () => {
    const ran = [];
    const quiet = console.error;
    console.error = () => {};
    const failed = start([
      [
        'broken',
        () => {
          throw new Error('boom');
        },
      ],
      ['after', () => ran.push('after')],
    ]);
    console.error = quiet;
    expect(failed).toEqual(['broken']);
    expect(ran).toEqual(['after']);
  });
});
