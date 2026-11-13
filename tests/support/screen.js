/**
 * tests/support/screen.js — find elements the way a user does: by role and accessible name, by
 * visible text, or by label. A deliberately small version of Testing Library's queries (that package
 * is not in this project's allowed tools), so integration tests assert on what the shopper sees and
 * not on ids or class names. Works in jsdom (Vitest) and in a real browser.
 *
 * Hidden content (the `hidden` attribute or aria-hidden="true" on the element or an ancestor) is
 * ignored, as assistive technology ignores it.
 */

/** Implicit ARIA roles for the elements these pages use. */
const IMPLICIT_ROLES = [
  ['a[href]', 'link'],
  ['img:not([alt=""])', 'img'],
  ['button', 'button'],
  ['h1, h2, h3, h4, h5, h6', 'heading'],
  ['ul, ol', 'list'],
  ['li', 'listitem'],
  ['select', 'combobox'],
  ['input[type="checkbox"]', 'checkbox'],
  ['input[type="radio"]', 'radio'],
  ['input[type="search"]', 'searchbox'],
  ['input:not([type]), input[type="text"], input[type="email"], textarea', 'textbox'],
  ['input[type="password"]', 'password'],
  ['nav', 'navigation'],
  ['aside', 'complementary'],
  ['section[aria-labelledby], section[aria-label]', 'region'],
  ['table', 'table'],
];

/** Collapse whitespace like a browser does when it reads text out. */
const normalise = (text) => (text || '').replace(/\s+/g, ' ').trim();

/**
 * Hidden from users (and assistive technology)?
 * @param {Element} element
 * @returns {boolean}
 */
export function isHidden(element) {
  for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
    if (node.hidden || node.getAttribute('aria-hidden') === 'true') return true;
  }
  return false;
}

/**
 * The element's role: explicit `role`, else the implicit one.
 * @param {Element} element
 * @returns {string | null}
 */
export function roleOf(element) {
  const explicit = element.getAttribute('role');
  if (explicit) return explicit.split(' ')[0];
  const match = IMPLICIT_ROLES.find(([selector]) => element.matches(selector));
  return match ? match[1] : null;
}

/** Visible text of an element, skipping hidden descendants. */
function visibleText(element) {
  let text = '';
  for (const child of element.childNodes) {
    if (child.nodeType === 3) text += child.textContent;
    else if (child.nodeType === 1 && !isHidden(child)) text += ` ${visibleText(child)} `;
  }
  return normalise(text);
}

/**
 * The accessible name (simplified accname: aria-labelledby, aria-label, <label>, then content).
 * @param {Element} element
 * @returns {string}
 */
export function nameOf(element) {
  const doc = element.ownerDocument;
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    return normalise(
      labelledBy
        .split(/\s+/)
        .map((id) => doc.getElementById(id)?.textContent || '')
        .join(' '),
    );
  }
  const label = element.getAttribute('aria-label');
  if (label) return normalise(label);
  if (element.matches('img')) return normalise(element.getAttribute('alt'));
  if (element.matches('input, select, textarea')) {
    const wrapping = element.closest('label');
    const forLabel = element.id && doc.querySelector(`label[for="${element.id}"]`);
    return visibleText(forLabel || wrapping || doc.createElement('span'));
  }
  return visibleText(element);
}

/** Does `text` match a string (exactly, after trimming) or a RegExp? */
const matches = (text, wanted) =>
  wanted === undefined ||
  (wanted instanceof RegExp ? wanted.test(text) : normalise(text) === wanted);

/**
 * Queries bound to a container (default: the whole document body).
 * @param {ParentNode} [container]
 */
export function within(container = document.body) {
  const all = () => [...container.querySelectorAll('*')].filter((el) => !isHidden(el));

  const queryAllByRole = (role, { name } = {}) =>
    all().filter((el) => roleOf(el) === role && matches(nameOf(el), name));

  /** Elements whose own visible text matches (the innermost ones). */
  const queryAllByText = (text) =>
    all().filter(
      (el) =>
        matches(visibleText(el), text) &&
        ![...el.children].some((child) => !isHidden(child) && matches(visibleText(child), text)),
    );

  const queryAllByLabelText = (text) =>
    all().filter((el) => el.matches('input, select, textarea') && matches(nameOf(el), text));

  /** Exactly one, or throw with a readable message. */
  const one = (found, what) => {
    if (found.length === 1) return found[0];
    throw new Error(
      `${found.length === 0 ? 'Found no' : `Found ${found.length}`} ${what}.\n` +
        `Visible text: ${visibleText(container).slice(0, 400)}`,
    );
  };
  const describe = (kind, value, options) =>
    `${kind} ${value}${options?.name !== undefined ? ` named ${options.name}` : ''}`;

  const queries = {
    getByRole: (role, options) =>
      one(queryAllByRole(role, options), describe('role', role, options)),
    getAllByRole: (role, options) => {
      const found = queryAllByRole(role, options);
      if (!found.length) one(found, describe('role', role, options));
      return found;
    },
    queryByRole: (role, options) => queryAllByRole(role, options)[0] || null,
    queryAllByRole,
    getByText: (text) => one(queryAllByText(text), `text ${text}`),
    queryByText: (text) => queryAllByText(text)[0] || null,
    getByLabelText: (text) => one(queryAllByLabelText(text), `field labelled ${text}`),
  };
  return {
    ...queries,
    findByRole: (role, options) => waitFor(() => queries.getByRole(role, options)),
    findAllByRole: (role, options) => waitFor(() => queries.getAllByRole(role, options)),
    findByText: (text) => waitFor(() => queries.getByText(text)),
  };
}

/** Queries over the whole page. */
export const screen = {
  ...Object.fromEntries(
    [
      'getByRole',
      'getAllByRole',
      'queryByRole',
      'queryAllByRole',
      'getByText',
      'queryByText',
      'getByLabelText',
      'findByRole',
      'findAllByRole',
      'findByText',
    ].map((method) => [method, (...args) => within(document.body)[method](...args)]),
  ),
};

/**
 * Retry `check` until it stops throwing (the UI updates after network responses).
 * @template T
 * @param {() => T} check
 * @param {{ timeout?: number, interval?: number }} [options]
 * @returns {Promise<T>}
 */
export async function waitFor(check, { timeout = 2000, interval = 20 } = {}) {
  const end = Date.now() + timeout;
  for (;;) {
    try {
      return check();
    } catch (error) {
      if (Date.now() > end) throw error;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
}

/**
 * The value shown next to a term in a description list (e.g. "Subtotal" -> "$19.99").
 * @param {string} term
 * @param {ParentNode} [container]
 * @returns {string}
 */
export function valueOfTerm(term, container = document.body) {
  const dt = [...container.querySelectorAll('dt')].find((el) => normalise(el.textContent) === term);
  if (!dt) throw new Error(`No term "${term}"`);
  return normalise(dt.nextElementSibling?.textContent);
}

/**
 * A user click (jsdom and browsers both dispatch a real click event).
 * @param {HTMLElement} element
 */
export function click(element) {
  if (element.disabled) throw new Error(`Cannot click a disabled ${roleOf(element)}`);
  element.click();
}
