// @vitest-environment jsdom
/**
 * Unit tests for src/utils/dom.js, the only module that creates elements: text is always inserted
 * as text (never parsed as HTML), attributes skip null/undefined, and the query helpers.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { clear, el, qs, qsa } from '../../src/utils/dom.js';

beforeEach(() => document.body.replaceChildren());

describe('dom helpers', () => {
  it('el() sets class, text, attributes, data-* and children', () => {
    const node = el(
      'a',
      {
        className: 'card link',
        text: 'Open',
        attrs: { href: '/x', title: null },
        dataset: { id: 7 },
      },
      [' now', el('span', { text: '!' })],
    );
    expect(node.tagName).toBe('A');
    expect(node.className).toBe('card link');
    expect(node.getAttribute('href')).toBe('/x');
    expect(node.hasAttribute('title')).toBe(false);
    expect(node.dataset.id).toBe('7');
    expect(node.textContent).toBe('Open now!');
  });

  it('text that looks like HTML is shown as text and never becomes an element', () => {
    const node = el('p', { text: '<img src=x onerror="alert(1)">' });
    expect(node.textContent).toBe('<img src=x onerror="alert(1)">');
    expect(node.querySelector('img')).toBe(null);
    expect(el('p', {}, ['<b>bold</b>']).children.length).toBe(0);
  });

  it('el() works without options or children', () => {
    expect(el('div').outerHTML).toBe('<div></div>');
  });

  it('qs/qsa search the document or a scope; clear() empties a node', () => {
    const list = el('ul', {}, [el('li', { text: 'a' }), el('li', { text: 'b' })]);
    document.body.append(list, el('li', { text: 'outside' }));
    expect(qs('li').textContent).toBe('a');
    expect(qsa('li').map((li) => li.textContent)).toEqual(['a', 'b', 'outside']);
    expect(qsa('li', list).length).toBe(2);
    expect(qs('.missing')).toBe(null);
    clear(list);
    expect(list.childNodes.length).toBe(0);
  });
});
