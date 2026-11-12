/*
 * src/components/nav.js — mobile navigation toggle.
 *
 * The open/closed state is aria-expanded on the button; CSS shows or hides
 * the list from that attribute, so the visual state and the announced state
 * can never disagree. Closed links are visibility:hidden in CSS, which also
 * removes them from the tab order.
 */
import * as dom from '../utils/dom.js';

const DESKTOP_QUERY = '(min-width: 64em)';

/**
 * Is the menu open?
 * @param {HTMLElement} toggle
 * @returns {boolean}
 */
function isOpen(toggle) {
  return toggle.getAttribute('aria-expanded') === 'true';
}

/**
 * Set the state the button announces and CSS reads.
 * @param {HTMLElement} toggle
 * @param {boolean} open
 */
function setOpen(toggle, open) {
  toggle.setAttribute('aria-expanded', String(open));
}

/**
 * Close the menu when a link is chosen, on Escape, or on a click outside the navigation.
 * @param {HTMLElement} toggle
 * @param {HTMLElement} menu
 * @param {HTMLElement} nav
 */
function bindCloseHandlers(toggle, menu, nav) {
  // Choosing a destination closes the menu.
  menu.addEventListener('click', function (event) {
    if (event.target.closest('.nav__link')) {
      setOpen(toggle, false);
    }
  });

  // Escape closes it and hands focus back to the button.
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen(toggle)) {
      setOpen(toggle, false);
      toggle.focus();
    }
  });

  // A click anywhere outside the navigation closes it.
  document.addEventListener('click', function (event) {
    if (isOpen(toggle) && !nav.contains(event.target)) {
      setOpen(toggle, false);
    }
  });
}

/**
 * Wire the toggle and the ways the menu closes again.
 */
export function init() {
  const toggle = dom.qs('.nav__toggle');
  const menu = dom.qs('.nav__list');
  const nav = dom.qs('.nav');
  if (!toggle || !menu || !nav) {
    return;
  }

  // Button click (Enter and Space also fire click on a <button>).
  toggle.addEventListener('click', function () {
    setOpen(toggle, !isOpen(toggle));
  });
  bindCloseHandlers(toggle, menu, nav);

  // Growing to the desktop layout resets the state, so the button never
  // reports "expanded" while it is hidden.
  window.matchMedia(DESKTOP_QUERY).addEventListener('change', function (event) {
    if (event.matches) {
      setOpen(toggle, false);
    }
  });
}
