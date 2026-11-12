/*
 * src/components/deals.js — previous / next controls for the deals strip.
 *
 * The strip is a native scroll container with CSS scroll snapping; these two
 * buttons are the keyboard and mouse alternative to swiping. They scroll by
 * one offer. At either end they use aria-disabled (not disabled) so a button
 * that has focus does not disappear from the tab order. They are hidden in
 * the HTML and shown here only when the strip really overflows.
 */
import * as dom from '../utils/dom.js';
const EDGE_TOLERANCE_PX = 2;

/**
 * Distance of one step: the width of an offer plus the gap between them.
 * @param {HTMLElement} viewport
 * @returns {number}
 */
function stepSize(viewport) {
  const track = dom.qs('.deals__track', viewport);
  const item = dom.qs('.deals__item', track);
  const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
  return item.getBoundingClientRect().width + gap;
}

/**
 * Show the controls only when the strip overflows, and mark the button
 * that points at an edge as aria-disabled.
 * @param {HTMLElement} viewport
 * @param {HTMLElement} controls
 */
function syncControls(viewport, controls) {
  const maxScroll = viewport.scrollWidth - viewport.clientWidth;
  controls.hidden = maxScroll <= EDGE_TOLERANCE_PX;

  dom.qsa('[data-deals-step]', controls).forEach(function (button) {
    const forward = Number(button.dataset.dealsStep) > 0;
    const atEdge = forward
      ? viewport.scrollLeft >= maxScroll - EDGE_TOLERANCE_PX
      : viewport.scrollLeft <= EDGE_TOLERANCE_PX;
    button.setAttribute('aria-disabled', String(atEdge));
  });
}

/**
 * Scroll one offer in the button's direction (smooth unless the user
 * prefers reduced motion).
 * @param {HTMLElement} viewport
 * @param {HTMLElement} button
 */
function step(viewport, button) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (button.getAttribute('aria-disabled') === 'true') {
    return;
  }
  viewport.scrollBy({
    left: Number(button.dataset.dealsStep) * stepSize(viewport),
    behavior: reduceMotion ? 'auto' : 'smooth',
  });
}

/**
 * Attach the listeners (only on pages with the strip).
 */
export function init() {
  const viewport = dom.qs('#deals-viewport');
  const controls = dom.qs('[data-deals-controls]');
  if (!viewport || !controls) {
    return;
  }

  dom.qsa('[data-deals-step]', controls).forEach(function (button) {
    button.addEventListener('click', function () {
      step(viewport, button);
    });
  });

  viewport.addEventListener(
    'scroll',
    function () {
      syncControls(viewport, controls);
    },
    { passive: true },
  );
  window.addEventListener('resize', function () {
    syncControls(viewport, controls);
  });
  syncControls(viewport, controls);
}
